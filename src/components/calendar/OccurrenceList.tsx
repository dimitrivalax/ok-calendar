import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventOccurrence } from '@/domain/types';
import { useCalendar } from '@/hooks/useCalendarContext';
import { dateFnsLocale } from '@/i18n';
import { href } from '@/navigation/href';

type OccurrenceListProps = {
  occurrences: EventOccurrence[];
  emptyMessage?: string;
  testID?: string;
  /** When true, initially scroll so the first future occurrence is at the top. */
  scrollToFirstFuture?: boolean;
};

function eventKey(event: EventOccurrence): string {
  return `${event.id}-${event.occurrenceStart}`;
}

export function OccurrenceList({
  occurrences,
  emptyMessage,
  testID,
  scrollToFirstFuture = false,
}: OccurrenceListProps) {
  const { locale } = useCalendar();
  const { t } = useTranslation(['calendar', 'event']);
  const router = useRouter();
  const dfLocale = dateFnsLocale(locale);
  const scrollRef = useRef<ScrollView>(null);
  const anchorRef = useRef<View>(null);
  const didScrollRef = useRef(false);

  const sections = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const occ of occurrences) {
      const key = format(parseISO(occ.occurrenceStart), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([day, events]) => ({ day, events }));
  }, [occurrences]);

  const firstFutureKey = useMemo(() => {
    if (!scrollToFirstFuture) return null;
    const nowIso = new Date().toISOString();
    const found = occurrences.find((occ) => occ.occurrenceStart >= nowIso);
    return found ? eventKey(found) : null;
  }, [occurrences, scrollToFirstFuture]);

  useEffect(() => {
    didScrollRef.current = false;
  }, [firstFutureKey, occurrences]);

  const scrollToAnchor = () => {
    if (!scrollToFirstFuture || !firstFutureKey || didScrollRef.current) return;
    const anchor = anchorRef.current;
    const scroll = scrollRef.current;
    if (!anchor || !scroll) return;

    anchor.measureInWindow((_ax, ay) => {
      scroll.measureInWindow((_sx, sy) => {
        const y = Math.max(0, ay - sy);
        didScrollRef.current = true;
        scroll.scrollTo({ y, animated: false });
      });
    });
  };

  return (
    <ScrollView ref={scrollRef} testID={testID} className="flex-1">
      <VStack className="pb-4">
        {sections.length === 0 && (
          <Box testID="occurrence-list-empty" className="p-4">
            <Text className="text-muted-foreground">
              {emptyMessage ?? t('calendar:noEvents')}
            </Text>
          </Box>
        )}
        {sections.map((item) => {
          const firstKey = item.events[0] ? eventKey(item.events[0]) : null;
          const anchorAtSection = firstFutureKey !== null && firstKey === firstFutureKey;

          const body = (
            <>
              <Text bold>
                {format(parseISO(item.day), 'EEEE d MMMM', { locale: dfLocale })}
              </Text>
              {item.events.map((event) => {
                const key = eventKey(event);
                const isEventAnchor =
                  !anchorAtSection && key === firstFutureKey;
                const card = (
                  <Box className="rounded-lg bg-muted p-3 border border-border">
                    <Text bold>{event.title}</Text>
                    <Text size="sm" className="text-muted-foreground">
                      {event.allDay
                        ? t('event:allDay')
                        : `${format(parseISO(event.occurrenceStart), 'HH:mm')} – ${format(parseISO(event.occurrenceEnd), 'HH:mm')}`}
                    </Text>
                  </Box>
                );
                return (
                  <Pressable
                    key={key}
                    onPress={() => router.push(href(`/event/${event.id}`))}
                    testID={`agenda-event-${event.id}`}
                  >
                    {isEventAnchor ? (
                      <View
                        ref={anchorRef}
                        collapsable={false}
                        onLayout={scrollToAnchor}
                      >
                        {card}
                      </View>
                    ) : (
                      card
                    )}
                  </Pressable>
                );
              })}
            </>
          );

          return (
            <VStack
              key={item.day}
              className="px-3 py-2 gap-2"
              {...(anchorAtSection
                ? {
                    ref: anchorRef,
                    collapsable: false,
                    onLayout: scrollToAnchor,
                  }
                : {})}
            >
              {body}
            </VStack>
          );
        })}
      </VStack>
    </ScrollView>
  );
}
