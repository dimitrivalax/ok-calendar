import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

export function DayView() {
  const { occurrences, cursorDate } = useCalendar();
  const { t } = useTranslation('calendar');
  const router = useRouter();

  const dayKey = format(cursorDate, 'yyyy-MM-dd');
  const dayEvents = occurrences.filter(
    (o) => format(parseISO(o.occurrenceStart), 'yyyy-MM-dd') === dayKey,
  );
  const allDay = dayEvents.filter((e) => e.allDay);
  const timed = dayEvents.filter((e) => !e.allDay);

  return (
    <ScrollView testID="view-day" className="flex-1">
      <VStack className="p-3 gap-2">
        {allDay.length > 0 && (
          <VStack className="gap-1 mb-2">
            {allDay.map((event) => (
              <Pressable
                key={`${event.id}-${event.occurrenceStart}`}
                onPress={() => router.push(href(`/event/${event.id}`))}
              >
                <Box className="rounded-md bg-primary-500 px-3 py-2">
                  <Text className="text-typography-0">{event.title}</Text>
                </Box>
              </Pressable>
            ))}
          </VStack>
        )}

        {Array.from({ length: 24 }, (_, hour) => (
          <Box key={hour} className="min-h-[48px] border-b border-outline-100">
            <Text size="xs" className="text-typography-400 mb-1">
              {`${hour.toString().padStart(2, '0')}:00`}
            </Text>
            {timed
              .filter((e) => parseISO(e.occurrenceStart).getHours() === hour)
              .map((event) => (
                <Pressable
                  key={`${event.id}-${event.occurrenceStart}`}
                  onPress={() => router.push(href(`/event/${event.id}`))}
                >
                  <Box className="rounded-md bg-primary-400/80 px-2 py-1 mb-1">
                    <Text size="sm" className="text-typography-0">
                      {format(parseISO(event.occurrenceStart), 'HH:mm')}{' '}
                      {event.title}
                    </Text>
                  </Box>
                </Pressable>
              ))}
          </Box>
        ))}

        {dayEvents.length === 0 && (
          <Text className="text-typography-500">{t('noEvents')}</Text>
        )}
      </VStack>
    </ScrollView>
  );
}
