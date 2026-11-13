import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
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

import type { CalendarEvent, EventOccurrence, ViewMode } from '@/domain/types';
import { expandOccurrences } from '@/domain/recurrence';
import { EventRepository } from '@/services/eventRepository';
import { SyncEngine } from '@/services/syncEngine';
import { CalendarService } from '@/services/calendarDevice';
import { getSetting, setSetting, getDb } from '@/db/client';
import {
  deviceLocale,
  isLocalePreference,
  resolveLocale,
  setAppLocale,
  type AppLocale,
  type LocalePreference,
} from '@/i18n';
import { NotificationService } from '@/services/notificationService';
import {
  registerBackgroundSyncTask,
  unregisterBackgroundSyncTask,
} from '@/services/backgroundSync';

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
  /** Resolved UI/date locale (preference or device). */
  locale: AppLocale;
  /** Persisted preference; `system` follows the device language. */
  localePreference: LocalePreference;
  changeLocale: (preference: LocalePreference) => Promise<void>;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

/** Inclusive agenda window length in days from cursor (start → start + N). */
export const AGENDA_RANGE_DAYS = 60;

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
      end: endOfDay(addDays(cursor, AGENDA_RANGE_DAYS)).toISOString(),
    };
  }
  return {
    start: startOfWeek(startOfMonth(cursor), WEEK_OPTIONS).toISOString(),
    end: endOfWeek(endOfMonth(cursor), WEEK_OPTIONS).toISOString(),
  };
}

/**
 * Unified SQLite fetch window around `cursor` that covers all 4 view modes
 * (month grid, week, day, and 60-day agenda) so switching tabs never needs
 * to reload events from SQLite or the device calendar.
 */
function windowForCursor(cursor: Date): { start: string; end: string } {
  const monthGridStart = startOfWeek(startOfMonth(cursor), WEEK_OPTIONS);
  const monthGridEnd = endOfWeek(endOfMonth(cursor), WEEK_OPTIONS);
  const agendaEnd = endOfDay(addDays(cursor, AGENDA_RANGE_DAYS));
  return {
    start: monthGridStart.toISOString(),
    end: (monthGridEnd > agendaEnd ? monthGridEnd : agendaEnd).toISOString(),
  };
}

function eventsFingerprint(evts: CalendarEvent[]): string {
  // Omit updatedAt: device pull rewrites it even when visible fields are unchanged.
  return evts
    .map(
      (e) =>
        `${e.id}\0${e.calendarId}\0${e.startAt}\0${e.endAt}\0${e.title}\0${e.allDay ? 1 : 0}\0${e.recurrence}\0${e.location ?? ''}\0${e.description ?? ''}`,
    )
    .join('\n');
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [localePreference, setLocalePreference] =
    useState<LocalePreference>('system');
  const [locale, setLocale] = useState<AppLocale>(() => deviceLocale());

  const refreshSeqRef = useRef(0);

  const applyEvents = useCallback(
    (next: CalendarEvent[], soft: boolean) => {
      const commit = () => {
        setEvents((prev) =>
          eventsFingerprint(prev) === eventsFingerprint(next)
            ? prev
            : next,
        );
      };
      if (soft) {
        startTransition(commit);
      } else {
        commit();
      }
    },
    [],
  );

  const windowRange = useMemo(() => windowForCursor(cursorDate), [cursorDate]);

  const viewRange = useMemo(
    () => rangeForView(viewMode, cursorDate),
    [viewMode, cursorDate],
  );

  const occurrences = useMemo(
    () => expandOccurrences(events, viewRange.start, viewRange.end),
    [events, viewRange.start, viewRange.end],
  );

  const refresh = useCallback(
    async (opts?: { soft?: boolean }) => {
      const seq = ++refreshSeqRef.current;
      const calendars = await EventRepository.listCalendars();
      const visibleIds = calendars.filter((c) => c.isVisible).map((c) => c.id);
      const nextEvents = await EventRepository.listInRange(
        windowRange.start,
        windowRange.end,
        visibleIds,
      );
      if (seq !== refreshSeqRef.current) return;
      applyEvents(nextEvents, opts?.soft === true);
    },
    [windowRange.start, windowRange.end, applyEvents],
  );

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const syncFromDevice = useCallback(async () => {
    const perm = await CalendarService.requestPermissions();
    const denied = perm === 'denied';
    setIsLocalOnly((prev) => (prev === denied ? prev : denied));
    if (perm === 'granted') {
      await SyncEngine.pull();
      await registerBackgroundSyncTask();
    } else {
      await unregisterBackgroundSyncTask();
    }
    // Background sync: keep current pixels until React can swap quietly.
    await refreshRef.current({ soft: true });
  }, []);

  const syncRef = useRef(syncFromDevice);
  useEffect(() => {
    syncRef.current = syncFromDevice;
  }, [syncFromDevice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await getDb();
      const savedLocale = await getSetting('locale');
      const preference: LocalePreference = isLocalePreference(savedLocale)
        ? savedLocale
        : 'system';
      const resolved = resolveLocale(preference);
      await setAppLocale(resolved);
      if (!cancelled) {
        setLocalePreference(preference);
        setLocale(resolved);
      }
      const perm = await CalendarService.requestPermissions();
      if (!cancelled) setIsLocalOnly(perm === 'denied');
      if (perm === 'granted') {
        await SyncEngine.pull();
        await registerBackgroundSyncTask();
      } else {
        await NotificationService.resyncWindow();
        await unregisterBackgroundSyncTask();
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

  // Optional periodic foreground sync while app remains open (~60s).
  useEffect(() => {
    if (!isReady) return;
    const FOREGROUND_POLL_INTERVAL_MS = 60_000;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void syncRef.current();
      }
    }, FOREGROUND_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
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

  const changeLocale = async (next: LocalePreference) => {
    const resolved = resolveLocale(next);
    await setAppLocale(resolved);
    await setSetting('locale', next);
    setLocalePreference(next);
    setLocale(resolved);
    await NotificationService.syncDailyDigest();
    await NotificationService.syncTomorrowDigest();
  };

  useEffect(() => {
    if (!isReady || localePreference !== 'system') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const resolved = deviceLocale();
      if (resolved === locale) return;
      void (async () => {
        await setAppLocale(resolved);
        setLocale(resolved);
        await NotificationService.syncDailyDigest();
        await NotificationService.syncTomorrowDigest();
      })();
    });
    return () => sub.remove();
  }, [isReady, localePreference, locale]);

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
        localePreference,
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
