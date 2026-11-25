import { useMutation } from '@tanstack/react-query';

import { setSetting } from '@/db/client';
import type { Calendar } from '@/domain/types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  DEFAULT_DIGEST_SETTINGS,
  type DigestSettings,
} from '@/hooks/queries/useSettingsQueries';
import {
  resolveLocale,
  setAppLocale,
  type LocalePreference,
} from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import {
  registerBackgroundSyncTask,
  unregisterBackgroundSyncTask,
} from '@/services/backgroundSync';
import { CalendarService } from '@/services/calendarDevice';
import {
  DAILY_DIGEST_ENABLED_KEY,
  DAILY_DIGEST_TIME_KEY,
  formatDigestTime,
  TOMORROW_DIGEST_ENABLED_KEY,
  TOMORROW_DIGEST_TIME_KEY,
} from '@/services/dailyDigest';
import { EventRepository } from '@/services/eventRepository';
import { NotificationService } from '@/services/notificationService';
import { SyncEngine } from '@/services/syncEngine';
import { setIsLocalOnly, setLocaleState } from '@/state/calendarStore';

export async function syncFromDeviceAction(): Promise<void> {
  const perm = await CalendarService.requestPermissions();
  const denied = perm === 'denied';
  setIsLocalOnly(denied);
  if (perm === 'granted') {
    await SyncEngine.pull();
    await registerBackgroundSyncTask();
  } else {
    await CalendarService.syncDeviceCalendarsIntoDb();
    await unregisterBackgroundSyncTask();
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.backgroundSync }),
  ]);
}

export function useSyncFromDevice() {
  return useMutation<void, Error, void>({
    mutationFn: syncFromDeviceAction,
  });
}

export function useSyncNow() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await syncFromDeviceAction();
      await SyncEngine.pushAllPending();
      await CalendarService.syncDeviceCalendarsIntoDb();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.settings.backgroundSync,
        }),
      ]);
    },
  });
}

export function useRequestPermissions() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await syncFromDeviceAction();
      await NotificationService.requestPermissions();
      await CalendarService.syncDeviceCalendarsIntoDb();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.settings.backgroundSync,
        }),
      ]);
    },
  });
}

export function useToggleCalendarVisibility() {
  return useMutation<
    void,
    Error,
    { id: string; isVisible: boolean },
    { previous?: Calendar[] }
  >({
    mutationFn: async ({ id, isVisible }) => {
      await EventRepository.updateCalendarVisibility(id, isVisible);
      await NotificationService.syncDailyDigest();
      await NotificationService.syncTomorrowDigest();
    },
    onMutate: async ({ id, isVisible }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calendars.all });
      const previous = queryClient.getQueryData<Calendar[]>(
        queryKeys.calendars.all,
      );
      if (previous) {
        queryClient.setQueryData<Calendar[]>(
          queryKeys.calendars.all,
          previous.map((cal) =>
            cal.id === id ? { ...cal, isVisible } : cal,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.calendars.all, context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
      ]);
    },
  });
}

export function useSetPrimaryCalendar() {
  return useMutation<void, Error, string>({
    mutationFn: (id) => EventRepository.setPrimaryCalendar(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all });
    },
  });
}

export function useChangeLocale() {
  return useMutation<void, Error, LocalePreference>({
    mutationFn: async (next) => {
      const resolved = resolveLocale(next);
      await setAppLocale(resolved);
      await setSetting('locale', next);
      setLocaleState(next, resolved);
      await NotificationService.syncDailyDigest();
      await NotificationService.syncTomorrowDigest();
    },
  });
}

type DigestPatch =
  | { kind: 'dailyEnabled'; enabled: boolean }
  | { kind: 'dailyTime'; hours: number; minutes: number }
  | { kind: 'tomorrowEnabled'; enabled: boolean }
  | { kind: 'tomorrowTime'; hours: number; minutes: number };

function applyDigestPatch(
  prev: DigestSettings,
  patch: DigestPatch,
): DigestSettings {
  if (patch.kind === 'dailyEnabled') {
    return { ...prev, digestEnabled: patch.enabled };
  }
  if (patch.kind === 'dailyTime') {
    return {
      ...prev,
      digestTime: formatDigestTime(patch.hours, patch.minutes),
    };
  }
  if (patch.kind === 'tomorrowEnabled') {
    return { ...prev, tomorrowDigestEnabled: patch.enabled };
  }
  return {
    ...prev,
    tomorrowDigestTime: formatDigestTime(patch.hours, patch.minutes),
  };
}

export function useUpdateDigestSetting() {
  return useMutation<void, Error, DigestPatch, { previous?: DigestSettings }>({
    mutationFn: async (patch) => {
      if (patch.kind === 'dailyEnabled') {
        await setSetting(
          DAILY_DIGEST_ENABLED_KEY,
          patch.enabled ? 'true' : 'false',
        );
        if (patch.enabled) {
          await NotificationService.requestPermissions();
        }
        await NotificationService.syncDailyDigest();
        return;
      }
      if (patch.kind === 'dailyTime') {
        await setSetting(
          DAILY_DIGEST_TIME_KEY,
          formatDigestTime(patch.hours, patch.minutes),
        );
        await NotificationService.syncDailyDigest();
        return;
      }
      if (patch.kind === 'tomorrowEnabled') {
        await setSetting(
          TOMORROW_DIGEST_ENABLED_KEY,
          patch.enabled ? 'true' : 'false',
        );
        if (patch.enabled) {
          await NotificationService.requestPermissions();
        }
        await NotificationService.syncTomorrowDigest();
        return;
      }
      await setSetting(
        TOMORROW_DIGEST_TIME_KEY,
        formatDigestTime(patch.hours, patch.minutes),
      );
      await NotificationService.syncTomorrowDigest();
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.digests });
      const previous = queryClient.getQueryData<DigestSettings>(
        queryKeys.settings.digests,
      );
      queryClient.setQueryData<DigestSettings>(
        queryKeys.settings.digests,
        applyDigestPatch(previous ?? DEFAULT_DIGEST_SETTINGS, patch),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.settings.digests, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.settings.digests,
      });
    },
  });
}
