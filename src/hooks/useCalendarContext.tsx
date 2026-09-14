import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { addMonths, startOfMonth, endOfMonth, startOfDay, endOfDay, addDays } from 'date-fns';

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
  isLocalOnly: boolean;
  locale: AppLocale;
  changeLocale: (locale: AppLocale) => Promise<void>;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

function rangeForView(mode: ViewMode, cursor: Date): { start: string; end: string } {
  if (mode === 'year') {
    const y = cursor.getFullYear();
    return {
      start: new Date(y, 0, 1).toISOString(),
      end: new Date(y, 11, 31, 23, 59, 59).toISOString(),
    };
  }
  if (mode === 'day') {
    return {
      start: startOfDay(cursor).toISOString(),
      end: endOfDay(cursor).toISOString(),
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

  const refresh = async () => {
    const calendars = await EventRepository.listCalendars();
    const visibleIds = calendars.filter((c) => c.isVisible).map((c) => c.id);
    const { start, end } = rangeForView(viewMode, cursorDate);
    const events = await EventRepository.listInRange(start, end, visibleIds);
    setOccurrences(expandOccurrences(events, start, end));
  };

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
      await refresh();
      if (!cancelled) setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, cursorDate, isReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isReady) {
        void SyncEngine.pull().then(refresh);
      }
    });
    return () => sub.remove();
  }, [isReady]);

  const shiftPeriod = (delta: number) => {
    setCursorDate((current) => {
      if (viewMode === 'year') {
        return new Date(current.getFullYear() + delta, current.getMonth(), 1);
      }
      if (viewMode === 'day' || viewMode === 'agenda') {
        return addDays(current, delta);
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
