import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgendaView } from '@/components/calendar/AgendaView';
import { DayView } from '@/components/calendar/DayView';
import { MonthView } from '@/components/calendar/MonthView';
import { ViewTabBar } from '@/components/calendar/ViewTabBar';
import { WeekView } from '@/components/calendar/WeekView';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

export default function CalendarScreen() {
  const {
    viewMode,
    setViewMode,
    cursorDate,
    setCursorDate,
    goToday,
    shiftPeriod,
    isLocalOnly,
    locale,
  } = useCalendar();
  const { t } = useTranslation(['calendar', 'common']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dfLocale = locale === 'fr' ? fr : enUS;

  const title = (() => {
    if (viewMode === 'day') {
      return format(cursorDate, 'EEEE d MMMM yyyy', { locale: dfLocale });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(cursorDate, { weekStartsOn: 1 });
      const end = endOfWeek(cursorDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: dfLocale })} – ${format(end, 'd MMM yyyy', { locale: dfLocale })}`;
    }
    if (viewMode === 'agenda') {
      const end = addDays(cursorDate, 60);
      return `${format(cursorDate, 'd MMM', { locale: dfLocale })} – ${format(end, 'd MMM yyyy', { locale: dfLocale })}`;
    }
    return format(cursorDate, 'MMMM yyyy', { locale: dfLocale });
  })();

  return (
    <>
      <Stack.Screen options={{ title: t('common:appName'), headerShown: false }} />
      <VStack className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {isLocalOnly && (
          <Box className="bg-warning px-3 py-2">
            <Text size="sm" className="text-black">
              {t('common:localOnlyBanner')}
            </Text>
          </Box>
        )}

        <HStack className="items-center justify-between px-3 py-2">
          <Button size="sm" variant="outline" onPress={() => shiftPeriod(-1)}>
            <ButtonIcon as={ChevronLeft} />
          </Button>
          <VStack className="items-center flex-1 px-2">
            <Text bold size="lg">
              {title}
            </Text>
            <Button size="sm" variant="link" onPress={goToday} testID="btn-today">
              <ButtonText>{t('common:today')}</ButtonText>
            </Button>
          </VStack>
          <HStack className="items-center gap-2">
            <Button size="sm" variant="outline" onPress={() => shiftPeriod(1)}>
              <ButtonIcon as={ChevronRight} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.push(href('/settings'))}
              testID="btn-settings"
              accessibilityLabel={t('calendar:settings')}
            >
              <ButtonIcon as={Settings} />
            </Button>
          </HStack>
        </HStack>

        <Box className="flex-1">
          {viewMode === 'month' && (
            <MonthView
              onSelectDay={(day) => {
                setCursorDate(day);
                setViewMode('day');
              }}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              onSelectDay={(day) => {
                setCursorDate(day);
                setViewMode('day');
              }}
            />
          )}
          {viewMode === 'day' && <DayView />}
          {viewMode === 'agenda' && <AgendaView />}
        </Box>

        <ViewTabBar />
      </VStack>
    </>
  );
}
