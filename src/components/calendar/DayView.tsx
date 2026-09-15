import { format, isSameDay, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

const HOUR_HEIGHT = 56;

export function DayView() {
  const { occurrences, cursorDate } = useCalendar();
  const { t } = useTranslation('calendar');
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const didCenterRef = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const dayKey = format(cursorDate, 'yyyy-MM-dd');
  const isToday = isSameDay(cursorDate, now);
  const dayEvents = occurrences.filter(
    (o) => format(parseISO(o.occurrenceStart), 'yyyy-MM-dd') === dayKey,
  );
  const allDay = dayEvents.filter((e) => e.allDay);
  const timed = dayEvents.filter((e) => !e.allDay);

  const nowOffset =
    now.getHours() * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    didCenterRef.current = false;
  }, [dayKey]);

  useEffect(() => {
    if (!isToday || viewportHeight === 0 || didCenterRef.current) return;
    didCenterRef.current = true;
    const y = Math.max(0, headerHeight + nowOffset - viewportHeight / 2);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [isToday, dayKey, viewportHeight, headerHeight, nowOffset]);

  return (
    <ScrollView
      ref={scrollRef}
      testID="panel-day"
      className="flex-1"
      onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
    >
      <VStack className="p-3">
        <VStack
          className={allDay.length > 0 ? 'gap-1 mb-2' : ''}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          {allDay.map((event) => (
            <Pressable
              key={`${event.id}-${event.occurrenceStart}`}
              onPress={() => router.push(href(`/event/${event.id}`))}
            >
              <Box className="rounded-md bg-primary px-3 py-2">
                <Text className="text-primary-foreground">{event.title}</Text>
              </Box>
            </Pressable>
          ))}
        </VStack>

        <Box className="relative">
          {Array.from({ length: 24 }, (_, hour) => (
            <Box
              key={hour}
              className="border-b border-border"
              style={{ height: HOUR_HEIGHT }}
            >
              <Text size="xs" className="text-muted-foreground mb-1">
                {`${hour.toString().padStart(2, '0')}:00`}
              </Text>
              {timed
                .filter((e) => parseISO(e.occurrenceStart).getHours() === hour)
                .map((event) => (
                  <Pressable
                    key={`${event.id}-${event.occurrenceStart}`}
                    onPress={() => router.push(href(`/event/${event.id}`))}
                  >
                    <Box className="rounded-md bg-primary/80 px-2 py-1 mb-1">
                      <Text size="sm" className="text-primary-foreground">
                        {format(parseISO(event.occurrenceStart), 'HH:mm')}{' '}
                        {event.title}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
            </Box>
          ))}

          {isToday && (
            <View
              pointerEvents="none"
              testID="now-indicator"
              className="absolute left-0 right-0 z-10 flex-row items-center"
              style={{ top: nowOffset }}
            >
              <Box className="ml-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <Box className="h-0.5 flex-1 bg-primary" />
            </View>
          )}
        </Box>

        {dayEvents.length === 0 && (
          <Text className="text-muted-foreground mt-2">{t('noEvents')}</Text>
        )}
      </VStack>
    </ScrollView>
  );
}
