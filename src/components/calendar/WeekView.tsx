import { useMemo } from 'react';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

type Props = {
  onSelectDay: (date: Date) => void;
};

export function WeekView({ onSelectDay }: Props) {
  const { cursorDate, occurrences, locale } = useCalendar();
  const { t } = useTranslation('calendar');
  const router = useRouter();
  const dfLocale = locale === 'fr' ? fr : enUS;

  const days = useMemo(() => {
    const start = startOfWeek(cursorDate, { weekStartsOn: 1 });
    const end = endOfWeek(cursorDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursorDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof occurrences>();
    for (const occ of occurrences) {
      const key = format(parseISO(occ.occurrenceStart), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    return map;
  }, [occurrences]);

  return (
    <ScrollView testID="panel-week" className="flex-1">
      <HStack className="p-2 gap-1 min-h-full">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          const dayEvents = eventsByDay.get(key) ?? [];
          const allDay = dayEvents.filter((e) => e.allDay);
          const timed = dayEvents.filter((e) => !e.allDay);

          return (
            <VStack key={key} className="flex-1 gap-1">
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelectDay(day)}
                testID={`week-day-${key}`}
              >
                <Box
                  className={`items-center rounded-md py-2 ${
                    isToday ? 'bg-primary-500/20' : 'bg-background-50'
                  }`}
                >
                  <Text size="xs" className="text-typography-500">
                    {format(day, 'EE', { locale: dfLocale })}
                  </Text>
                  <Text bold={isToday}>{format(day, 'd')}</Text>
                </Box>
              </Pressable>

              <VStack className="gap-1">
                {allDay.map((event) => (
                  <Pressable
                    key={`${event.id}-${event.occurrenceStart}`}
                    onPress={() => router.push(href(`/event/${event.id}`))}
                  >
                    <Box className="rounded-md bg-primary-500 px-1 py-1">
                      <Text size="xs" className="text-typography-0" numberOfLines={2}>
                        {event.title}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
                {timed.map((event) => (
                  <Pressable
                    key={`${event.id}-${event.occurrenceStart}`}
                    onPress={() => router.push(href(`/event/${event.id}`))}
                  >
                    <Box className="rounded-md bg-primary-400/80 px-1 py-1">
                      <Text size="xs" className="text-typography-0" numberOfLines={1}>
                        {format(parseISO(event.occurrenceStart), 'HH:mm')}
                      </Text>
                      <Text size="xs" className="text-typography-0" numberOfLines={2}>
                        {event.title}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
                {dayEvents.length === 0 && (
                  <Text size="xs" className="text-typography-300 text-center mt-2">
                    {t('noEvents')}
                  </Text>
                )}
              </VStack>
            </VStack>
          );
        })}
      </HStack>
    </ScrollView>
  );
}
