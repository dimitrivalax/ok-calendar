import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getDb, getSetting } from '@/db/client';
import { syncFromDeviceAction } from '@/hooks/mutations/useCalendarMutations';
import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  deviceLocale,
  isLocalePreference,
  resolveLocale,
  setAppLocale,
  type LocalePreference,
} from '@/i18n';
import { attachAppStateFocusManager, queryClient } from '@/lib/queryClient';
import {
  registerBackgroundSyncTask,
  unregisterBackgroundSyncTask,
} from '@/services/backgroundSync';
import { CalendarService } from '@/services/calendarDevice';
import { NotificationService } from '@/services/notificationService';
import { SyncEngine } from '@/services/syncEngine';
import {
  setIsLocalOnly,
  setIsReady,
  setLocaleState,
  setResolvedLocale,
  useIsAppReady,
  useLocale,
  useLocalePreference,
} from '@/state/calendarStore';

const FOREGROUND_POLL_INTERVAL_MS = 60_000;

export function AppBootstrap() {
  const isReady = useIsAppReady();
  const locale = useLocale();
  const localePreference = useLocalePreference();

  // Wire TanStack Query focusManager to React Native AppState once.
  useEffect(() => {
    attachAppStateFocusManager();
  }, []);

  // One-time app bootstrap: SQLite, locale preference, device calendar permissions & initial sync.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await getDb();
      const savedLocale = await getSetting('locale');
      const preference: LocalePreference = isLocalePreference(savedLocale)
        ? savedLocale
        : 'system';
      const resolved = resolveLocale(preference);
      await setAppLocale(resolved);
      if (!cancelled) {
        setLocaleState(preference, resolved);
      }
      const perm = await CalendarService.requestPermissions();
      if (!cancelled) {
        setIsLocalOnly(perm === 'denied');
      }
      if (perm === 'granted') {
        await SyncEngine.pull();
        await registerBackgroundSyncTask();
      } else {
        await NotificationService.resyncWindow();
        await unregisterBackgroundSyncTask();
      }
      if (!cancelled) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.settings.backgroundSync,
          }),
        ]);
        setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync device calendar whenever the app returns to foreground.
  useEffect(() => {
    if (!isReady) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncFromDeviceAction();
      }
    });
    return () => sub.remove();
  }, [isReady]);

  // Optional periodic foreground sync while app remains open (~60s).
  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void syncFromDeviceAction();
      }
    }, FOREGROUND_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isReady]);

  // Follow device locale changes while preference is `system`.
  useEffect(() => {
    if (!isReady || localePreference !== 'system') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const resolved = deviceLocale();
      if (resolved === locale) return;
      void (async () => {
        await setAppLocale(resolved);
        setResolvedLocale(resolved);
        await NotificationService.syncDailyDigest();
        await NotificationService.syncTomorrowDigest();
      })();
    });
    return () => sub.remove();
  }, [isReady, localePreference, locale]);

  return null;
}
