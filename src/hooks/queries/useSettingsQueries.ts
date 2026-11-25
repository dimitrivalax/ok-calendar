import { useQuery } from '@tanstack/react-query';

import { getSetting } from '@/db/client';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { isBackgroundSyncRegistered } from '@/services/backgroundSync';
import {
  DAILY_DIGEST_ENABLED_KEY,
  DAILY_DIGEST_TIME_KEY,
  DEFAULT_DAILY_DIGEST_TIME,
  DEFAULT_TOMORROW_DIGEST_TIME,
  formatDigestTime,
  isDailyDigestEnabled,
  isTomorrowDigestEnabled,
  parseDigestTime,
  parseTomorrowDigestTime,
  TOMORROW_DIGEST_ENABLED_KEY,
  TOMORROW_DIGEST_TIME_KEY,
} from '@/services/dailyDigest';

export type DigestSettings = {
  digestEnabled: boolean;
  digestTime: string;
  tomorrowDigestEnabled: boolean;
  tomorrowDigestTime: string;
};

export const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
  digestEnabled: true,
  digestTime: DEFAULT_DAILY_DIGEST_TIME,
  tomorrowDigestEnabled: true,
  tomorrowDigestTime: DEFAULT_TOMORROW_DIGEST_TIME,
};

export function useDigestSettings() {
  return useQuery<DigestSettings>({
    queryKey: queryKeys.settings.digests,
    queryFn: async () => {
      const [enabledRaw, timeRaw, tomorrowEnabledRaw, tomorrowTimeRaw] =
        await Promise.all([
          getSetting(DAILY_DIGEST_ENABLED_KEY),
          getSetting(DAILY_DIGEST_TIME_KEY),
          getSetting(TOMORROW_DIGEST_ENABLED_KEY),
          getSetting(TOMORROW_DIGEST_TIME_KEY),
        ]);
      const parsed = parseDigestTime(timeRaw);
      const tomorrowParsed = parseTomorrowDigestTime(tomorrowTimeRaw);
      return {
        digestEnabled: isDailyDigestEnabled(enabledRaw),
        digestTime: formatDigestTime(parsed.hours, parsed.minutes),
        tomorrowDigestEnabled: isTomorrowDigestEnabled(tomorrowEnabledRaw),
        tomorrowDigestTime: formatDigestTime(
          tomorrowParsed.hours,
          tomorrowParsed.minutes,
        ),
      };
    },
  });
}

export function useBackgroundSyncStatus() {
  return useQuery<boolean>({
    queryKey: queryKeys.settings.backgroundSync,
    queryFn: () => isBackgroundSyncRegistered(),
  });
}
