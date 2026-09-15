import { format, parseISO } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

export function AgendaView() {
  const { occurrences, locale } = useCalendar();
  const { t } = useTranslation(['calendar', 'event']);
  const router = useRouter();
  const dfLocale = locale === 'fr' ? fr : enUS;

  const sections = useMemo(() => {
    const map = new Map<string, typeof occurrences>();
    for (const occ of occurrences) {
      const key = format(parseISO(occ.occurrenceStart), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([day, events]) => ({ day, events }));
  }, [occurrences]);

  return (
    <ScrollView testID="panel-agenda" className="flex-1">
      <VStack className="pb-4">
        {sections.length === 0 && (
          <Text className="p-4 text-muted-foreground">{t('calendar:noEvents')}</Text>
        )}
        {sections.map((item) => (
          <VStack key={item.day} className="px-3 py-2 gap-2">
            <Text bold>
              {format(parseISO(item.day), 'EEEE d MMMM', { locale: dfLocale })}
            </Text>
            {item.events.map((event) => (
              <Pressable
                key={`${event.id}-${event.occurrenceStart}`}
                onPress={() => router.push(href(`/event/${event.id}`))}
                testID={`agenda-event-${event.id}`}
              >
                <Box className="rounded-lg bg-muted p-3 border border-border">
                  <Text bold>{event.title}</Text>
                  <Text size="sm" className="text-muted-foreground">
                    {event.allDay
                      ? t('event:allDay')
                      : `${format(parseISO(event.occurrenceStart), 'HH:mm')} – ${format(parseISO(event.occurrenceEnd), 'HH:mm')}`}
                  </Text>
                </Box>
              </Pressable>
            ))}
          </VStack>
        ))}
      </VStack>
    </ScrollView>
  );
}
