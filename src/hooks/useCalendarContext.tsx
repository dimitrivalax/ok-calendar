import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { EventOccurrence, ViewMode } from '@/domain/types';
import { expandOccurrences } from '@/domain/recurrence';
import { EventRepository } from '@/services/eventRepository';
import { SyncEngine } from '@/services/syncEngine';
import { CalendarService } from '@/services/calendarDevice';
import { getSetting, setSetting, getDb } from '@/db/client';
import { setAppLocale, type AppLocale } from '@/i18n';

type CalendarContextValue = {
  isReady: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  cursorDate: Date;
  setCursorDate: (date: Date) => void;
  goToday: () => void;
  shiftPeriod: (delta: number) => void;
  occurrences: EventOccurrence[];
  refresh: () => Promise<void>;
  syncFromDevice: () => Promise<void>;
  isLocalOnly: boolean;
  locale: AppLocale;
  changeLocale: (locale: AppLocale) => Promise<void>;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

function rangeForView(mode: ViewMode, cursor: Date): { start: string; end: string } {
  if (mode === 'day') {
    return {
      start: startOfDay(cursor).toISOString(),
      end: endOfDay(cursor).toISOString(),
    };
  }
  if (mode === 'week') {
    return {
      start: startOfWeek(cursor, WEEK_OPTIONS).toISOString(),
      end: endOfWeek(cursor, WEEK_OPTIONS).toISOString(),
    };
  }
  if (mode === 'agenda') {
    return {
      start: startOfDay(cursor).toISOString(),
      end: endOfDay(addDays(cursor, 60)).toISOString(),
    };
  }
  return {
    start: startOfMonth(cursor).toISOString(),
    end: endOfMonth(cursor).toISOString(),
  };
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [locale, setLocale] = useState<AppLocale>('en');

  const refresh = useCallback(async () => {
    const calendars = await EventRepository.listCalendars();
    const visibleIds = calendars.filter((c) => c.isVisible).map((c) => c.id);
    const { start, end } = rangeForView(viewMode, cursorDate);
    const events = await EventRepository.listInRange(start, end, visibleIds);
    setOccurrences(expandOccurrences(events, start, end));
  }, [viewMode, cursorDate]);

  const syncFromDevice = useCallback(async () => {
    const perm = await CalendarService.requestPermissions();
    setIsLocalOnly(perm === 'denied');
    if (perm === 'granted') {
      await SyncEngine.pull();
    }
    await refresh();
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const syncRef = useRef(syncFromDevice);
  syncRef.current = syncFromDevice;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await getDb();
      const savedLocale = (await getSetting('locale')) as AppLocale | null;
      if (savedLocale === 'en' || savedLocale === 'fr') {
        await setAppLocale(savedLocale);
        if (!cancelled) setLocale(savedLocale);
      }
      const perm = await CalendarService.requestPermissions();
      if (!cancelled) setIsLocalOnly(perm === 'denied');
      if (perm === 'granted') {
        await SyncEngine.pull();
      }
      await refreshRef.current();
      if (!cancelled) setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync view window
    void refresh();
  }, [refresh, isReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isReady) {
        void syncRef.current();
      }
    });
    return () => sub.remove();
  }, [isReady]);

  const shiftPeriod = (delta: number) => {
    setCursorDate((current) => {
      if (viewMode === 'day') {
        return addDays(current, delta);
      }
      if (viewMode === 'week') {
        return addWeeks(current, delta);
      }
      if (viewMode === 'agenda') {
        return addWeeks(current, delta);
      }
      return addMonths(current, delta);
    });
  };

  const changeLocale = async (next: AppLocale) => {
    await setAppLocale(next);
    await setSetting('locale', next);
    setLocale(next);
  };

  return (
    <CalendarContext.Provider
      value={{
        isReady,
        viewMode,
        setViewMode,
        cursorDate,
        setCursorDate,
        goToday: () => setCursorDate(new Date()),
        shiftPeriod,
        occurrences,
        refresh,
        syncFromDevice,
        isLocalOnly,
        locale,
        changeLocale,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
