import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { Stack, useRouter } from 'expo-router';
import { Search, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AgendaView } from '@/components/calendar/AgendaView';
import { CalendarTitle } from '@/components/calendar/CalendarTitle';
import { DayView } from '@/components/calendar/DayView';
import { MonthView } from '@/components/calendar/MonthView';
import { ViewTabBar } from '@/components/calendar/ViewTabBar';
import { WeekView } from '@/components/calendar/WeekView';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  AGENDA_RANGE_DAYS,
  useCalendar,
} from '@/hooks/useCalendarContext';
import { dateFnsLocale } from '@/i18n';
import { href } from '@/navigation/href';

const SWIPE_THRESHOLD = 50;

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
  const dfLocale = dateFnsLocale(locale);

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
      const end = addDays(cursorDate, AGENDA_RANGE_DAYS);
      return `${format(cursorDate, 'd MMM', { locale: dfLocale })} – ${format(end, 'd MMM yyyy', { locale: dfLocale })}`;
    }
    return format(cursorDate, 'MMMM yyyy', { locale: dfLocale });
  })();

  const periodSwipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      'worklet';
      if (event.translationX > SWIPE_THRESHOLD) {
        scheduleOnRN(shiftPeriod, -1);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        scheduleOnRN(shiftPeriod, 1);
      }
    });

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

        <HStack className="items-center px-3 py-2 gap-1">
          <VStack className="min-w-0 flex-1 items-center px-1">
            <CalendarTitle
              title={title}
              value={cursorDate}
              onChange={setCursorDate}
              locale={locale}
            />
            <Button size="sm" variant="link" onPress={goToday} testID="btn-today">
              <ButtonText>{t('common:today')}</ButtonText>
            </Button>
          </VStack>
          <Button
            size="sm"
            variant="outline"
            onPress={() => router.push(href('/search'))}
            testID="btn-search"
            accessibilityLabel={t('calendar:search')}
          >
            <ButtonIcon as={Search} />
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

        <GestureDetector gesture={periodSwipe}>
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
        </GestureDetector>

        <ViewTabBar />
      </VStack>
    </>
  );
}
