import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Calendar } from '@/domain/types';
import { useCalendar } from '@/hooks/useCalendarContext';
import {
  useThemePreference,
  type ThemePreference,
} from '@/hooks/useThemePreference';
import type { AppLocale } from '@/i18n';
import { CalendarService } from '@/services/calendarDevice';
import { EventRepository } from '@/services/eventRepository';
import { NotificationService } from '@/services/notificationService';
import { SyncEngine } from '@/services/syncEngine';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { t } = useTranslation(['settings', 'calendar', 'common']);
  const { locale, changeLocale, refresh, isLocalOnly } = useCalendar();
  const { preference, setPreference } = useThemePreference();
  const insets = useSafeAreaInsets();
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  const loadCalendars = async () => {
    await CalendarService.syncDeviceCalendarsIntoDb();
    setCalendars(await EventRepository.listCalendars());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch calendars on mount
    void loadCalendars();
  }, []);

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
          <HStack className="gap-2" testID="settings-locale">
            {(['en', 'fr'] as AppLocale[]).map((code) => (
              <Button
                key={code}
                variant={locale === code ? 'default' : 'outline'}
                onPress={() => changeLocale(code)}
                testID={`locale-${code}`}
              >
                <ButtonText>
                  {code === 'en'
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

        <VStack className="gap-2">
          <Text bold>{t('settings:permissions')}</Text>
          <Text>
            {t('settings:calendarPermission')}:{' '}
            {isLocalOnly ? t('settings:denied') : t('settings:granted')}
          </Text>
          <Button
            variant="outline"
            onPress={async () => {
              await CalendarService.requestPermissions();
              await NotificationService.requestPermissions();
            }}
          >
            <ButtonText>{t('settings:permissions')}</ButtonText>
          </Button>
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t('settings:sync')}</Text>
          <Button
            onPress={async () => {
              await SyncEngine.pull();
              await SyncEngine.pushAllPending();
              await refresh();
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
                onValueChange={async (value: boolean) => {
                  await EventRepository.updateCalendarVisibility(item.id, value);
                  await loadCalendars();
                  await refresh();
                }}
              />
            </HStack>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
