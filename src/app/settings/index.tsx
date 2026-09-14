import { useTranslation } from 'react-i18next';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { SyncEngine } from '@/services/syncEngine';
import { CalendarService } from '@/services/calendarDevice';
import { NotificationService } from '@/services/notificationService';
import type { AppLocale } from '@/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation(['settings', 'calendar', 'common']);
  const { locale, changeLocale, refresh, isLocalOnly } = useCalendar();

  return (
    <VStack className="flex-1 p-4 gap-6">
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
    </VStack>
  );
}
