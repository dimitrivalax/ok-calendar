import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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

  const periodSwipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      'worklet';
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(shiftPeriod)(-1);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(shiftPeriod)(1);
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
          <Button size="sm" variant="outline" onPress={() => shiftPeriod(-1)}>
            <ButtonIcon as={ChevronLeft} />
          </Button>
          <VStack className="min-w-0 flex-1 items-center px-1">
            <Text bold size="lg" className="text-center" numberOfLines={2}>
              {title}
            </Text>
            <Button size="sm" variant="link" onPress={goToday} testID="btn-today">
              <ButtonText>{t('common:today')}</ButtonText>
            </Button>
          </VStack>
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
