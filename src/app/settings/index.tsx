import { useEffect, useState } from 'react';
import { Platform, ScrollView, TextInput } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { set } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getSetting, setSetting } from '@/db/client';
import type { Calendar } from '@/domain/types';
import { useCalendar } from '@/hooks/useCalendarContext';
import {
  useThemePreference,
  type ThemePreference,
} from '@/hooks/useThemePreference';
import type { LocalePreference } from '@/i18n';
import { CalendarService } from '@/services/calendarDevice';
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
import { EventRepository } from '@/services/eventRepository';
import { NotificationService } from '@/services/notificationService';
import { SyncEngine } from '@/services/syncEngine';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];
const LOCALE_OPTIONS: LocalePreference[] = ['system', 'en', 'fr'];

function timeToDate(hours: number, minutes: number): Date {
  return set(new Date(), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation(['settings', 'calendar', 'common']);
  const {
    localePreference,
    changeLocale,
    refresh,
    syncFromDevice,
    isLocalOnly,
  } = useCalendar();
  const { preference, setPreference } = useThemePreference();
  const insets = useSafeAreaInsets();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState(DEFAULT_DAILY_DIGEST_TIME);
  const [tomorrowDigestEnabled, setTomorrowDigestEnabled] = useState(true);
  const [tomorrowDigestTime, setTomorrowDigestTime] = useState(
    DEFAULT_TOMORROW_DIGEST_TIME,
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTomorrowTimePicker, setShowTomorrowTimePicker] = useState(false);

  const loadCalendars = async () => {
    await CalendarService.syncDeviceCalendarsIntoDb();
    setCalendars(await EventRepository.listCalendars());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch calendars on mount
    void loadCalendars();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [enabledRaw, timeRaw, tomorrowEnabledRaw, tomorrowTimeRaw] =
        await Promise.all([
          getSetting(DAILY_DIGEST_ENABLED_KEY),
          getSetting(DAILY_DIGEST_TIME_KEY),
          getSetting(TOMORROW_DIGEST_ENABLED_KEY),
          getSetting(TOMORROW_DIGEST_TIME_KEY),
        ]);
      if (cancelled) return;
      setDigestEnabled(isDailyDigestEnabled(enabledRaw));
      const parsed = parseDigestTime(timeRaw);
      setDigestTime(formatDigestTime(parsed.hours, parsed.minutes));
      setTomorrowDigestEnabled(isTomorrowDigestEnabled(tomorrowEnabledRaw));
      const tomorrowParsed = parseTomorrowDigestTime(tomorrowTimeRaw);
      setTomorrowDigestTime(
        formatDigestTime(tomorrowParsed.hours, tomorrowParsed.minutes),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistDigestEnabled = async (next: boolean) => {
    setDigestEnabled(next);
    await setSetting(DAILY_DIGEST_ENABLED_KEY, next ? 'true' : 'false');
    if (next) {
      await NotificationService.requestPermissions();
    }
    await NotificationService.syncDailyDigest();
  };

  const persistDigestTime = async (hours: number, minutes: number) => {
    const next = formatDigestTime(hours, minutes);
    setDigestTime(next);
    await setSetting(DAILY_DIGEST_TIME_KEY, next);
    await NotificationService.syncDailyDigest();
  };

  const persistTomorrowDigestEnabled = async (next: boolean) => {
    setTomorrowDigestEnabled(next);
    await setSetting(TOMORROW_DIGEST_ENABLED_KEY, next ? 'true' : 'false');
    if (next) {
      await NotificationService.requestPermissions();
    }
    await NotificationService.syncTomorrowDigest();
  };

  const persistTomorrowDigestTime = async (hours: number, minutes: number) => {
    const next = formatDigestTime(hours, minutes);
    setTomorrowDigestTime(next);
    await setSetting(TOMORROW_DIGEST_TIME_KEY, next);
    await NotificationService.syncTomorrowDigest();
  };

  const onAndroidTimeChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    void persistDigestTime(selected.getHours(), selected.getMinutes());
  };

  const onAndroidTomorrowTimeChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setShowTomorrowTimePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    void persistTomorrowDigestTime(selected.getHours(), selected.getMinutes());
  };

  const digestDate = (() => {
    const { hours, minutes } = parseDigestTime(digestTime);
    return timeToDate(hours, minutes);
  })();

  const tomorrowDigestDate = (() => {
    const { hours, minutes } = parseTomorrowDigestTime(tomorrowDigestTime);
    return timeToDate(hours, minutes);
  })();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <VStack className="gap-6">
        <Text size="xl" bold>
          {t('settings:title')}
        </Text>

        <VStack className="gap-2">
          <Text bold>{t('settings:language')}</Text>
          <HStack className="gap-2 flex-wrap" testID="settings-locale">
            {LOCALE_OPTIONS.map((code) => (
              <Button
                key={code}
                variant={localePreference === code ? 'default' : 'outline'}
                onPress={() => changeLocale(code)}
                testID={`locale-${code}`}
              >
                <ButtonText>
                  {code === 'system'
                    ? t('settings:languageSystem')
                    : code === 'en'
                      ? t('settings:languageEn')
                      : t('settings:languageFr')}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t('settings:theme')}</Text>
          <HStack className="gap-2 flex-wrap" testID="settings-theme">
            {THEME_OPTIONS.map((mode) => (
              <Button
                key={mode}
                variant={preference === mode ? 'default' : 'outline'}
                onPress={() => setPreference(mode)}
                testID={`theme-${mode}`}
              >
                <ButtonText>
                  {mode === 'system'
                    ? t('settings:themeSystem')
                    : mode === 'light'
                      ? t('settings:themeLight')
                      : t('settings:themeDark')}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        </VStack>

        <VStack className="gap-2" testID="settings-daily-digest">
          <HStack className="items-center justify-between">
            <VStack className="flex-1 pr-3 gap-1">
              <Text bold>{t('settings:dailyDigest')}</Text>
              <Text size="xs" className="text-muted-foreground">
                {t('settings:dailyDigestHint')}
              </Text>
            </VStack>
            <Switch
              value={digestEnabled}
              onValueChange={(value: boolean) => {
                void persistDigestEnabled(value);
              }}
              accessibilityLabel={t('settings:dailyDigest')}
              testID="daily-digest-enabled"
            />
          </HStack>
          {digestEnabled ? (
            <VStack className="gap-1">
              <Text>{t('settings:dailyDigestTime')}</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  accessibilityLabel={t('settings:dailyDigestTime')}
                  className="min-h-9 w-32 rounded-md border border-border px-3 py-1 text-sm text-foreground"
                  // @ts-expect-error web-only input type
                  type="time"
                  value={digestTime}
                  onChangeText={(raw) => {
                    if (!raw) return;
                    const parsed = parseDigestTime(raw);
                    void persistDigestTime(parsed.hours, parsed.minutes);
                  }}
                  testID="daily-digest-time"
                />
              ) : Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={digestDate}
                  mode="time"
                  display="compact"
                  locale={i18n.language}
                  onChange={(_event, selected) => {
                    if (!selected) return;
                    void persistDigestTime(
                      selected.getHours(),
                      selected.getMinutes(),
                    );
                  }}
                  testID="daily-digest-time"
                />
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => setShowTimePicker(true)}
                    testID="daily-digest-time"
                  >
                    <ButtonText>{digestTime}</ButtonText>
                  </Button>
                  {showTimePicker ? (
                    <DateTimePicker
                      value={digestDate}
                      mode="time"
                      display="default"
                      onChange={onAndroidTimeChange}
                    />
                  ) : null}
                </>
              )}
            </VStack>
          ) : null}
        </VStack>

        <VStack className="gap-2" testID="settings-tomorrow-digest">
          <HStack className="items-center justify-between">
            <VStack className="flex-1 pr-3 gap-1">
              <Text bold>{t('settings:tomorrowDigest')}</Text>
              <Text size="xs" className="text-muted-foreground">
                {t('settings:tomorrowDigestHint')}
              </Text>
            </VStack>
            <Switch
              value={tomorrowDigestEnabled}
              onValueChange={(value: boolean) => {
                void persistTomorrowDigestEnabled(value);
              }}
              accessibilityLabel={t('settings:tomorrowDigest')}
              testID="tomorrow-digest-enabled"
            />
          </HStack>
          {tomorrowDigestEnabled ? (
            <VStack className="gap-1">
              <Text>{t('settings:tomorrowDigestTime')}</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  accessibilityLabel={t('settings:tomorrowDigestTime')}
                  className="min-h-9 w-32 rounded-md border border-border px-3 py-1 text-sm text-foreground"
                  // @ts-expect-error web-only input type
                  type="time"
                  value={tomorrowDigestTime}
                  onChangeText={(raw) => {
                    if (!raw) return;
                    const parsed = parseTomorrowDigestTime(raw);
                    void persistTomorrowDigestTime(
                      parsed.hours,
                      parsed.minutes,
                    );
                  }}
                  testID="tomorrow-digest-time"
                />
              ) : Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={tomorrowDigestDate}
                  mode="time"
                  display="compact"
                  locale={i18n.language}
                  onChange={(_event, selected) => {
                    if (!selected) return;
                    void persistTomorrowDigestTime(
                      selected.getHours(),
                      selected.getMinutes(),
                    );
                  }}
                  testID="tomorrow-digest-time"
                />
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => setShowTomorrowTimePicker(true)}
                    testID="tomorrow-digest-time"
                  >
                    <ButtonText>{tomorrowDigestTime}</ButtonText>
                  </Button>
                  {showTomorrowTimePicker ? (
                    <DateTimePicker
                      value={tomorrowDigestDate}
                      mode="time"
                      display="default"
                      onChange={onAndroidTomorrowTimeChange}
                    />
                  ) : null}
                </>
              )}
            </VStack>
          ) : null}
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t('settings:permissions')}</Text>
          <Text>
            {t('settings:calendarPermission')}:{' '}
            {isLocalOnly ? t('settings:denied') : t('settings:granted')}
          </Text>
          <Button
            variant="outline"
            onPress={async () => {
              await syncFromDevice();
              await NotificationService.requestPermissions();
              await loadCalendars();
            }}
          >
            <ButtonText>{t('settings:permissions')}</ButtonText>
          </Button>
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t('settings:sync')}</Text>
          <Button
            onPress={async () => {
              await syncFromDevice();
              await SyncEngine.pushAllPending();
              await loadCalendars();
            }}
            testID="btn-sync-now"
          >
            <ButtonText>{t('calendar:syncNow')}</ButtonText>
          </Button>
        </VStack>

        <VStack className="gap-2" testID="calendar-list">
          <Text bold>{t('calendar:calendars')}</Text>
          {calendars.map((item) => (
            <HStack
              key={item.id}
              className="items-center justify-between py-3 border-b border-border"
            >
              <HStack className="items-center gap-2 flex-1">
                <Box
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <VStack className="flex-1">
                  <Text>{item.title}</Text>
                  <Text size="xs" className="text-muted-foreground">
                    {item.source}
                    {!item.allowsModifications ? ' · read-only' : ''}
                  </Text>
                </VStack>
              </HStack>
              <Switch
                value={item.isVisible}
                accessibilityLabel={t('calendar:toggleCalendarVisibility', {
                  title: item.title,
                })}
                onValueChange={async (value: boolean) => {
                  await EventRepository.updateCalendarVisibility(item.id, value);
                  await loadCalendars();
                  await refresh();
                  await NotificationService.syncDailyDigest();
                  await NotificationService.syncTomorrowDigest();
                }}
              />
            </HStack>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
