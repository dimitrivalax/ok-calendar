import { format, parseISO } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

export function AgendaView() {
  const { occurrences, locale } = useCalendar();
  const { t } = useTranslation('calendar');
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
    <FlatList
      testID="panel-agenda"
      className="flex-1"
      data={sections}
      keyExtractor={(item) => item.day}
      ListEmptyComponent={
        <Text className="p-4 text-typography-500">{t('noEvents')}</Text>
      }
      renderItem={({ item }) => (
        <VStack className="px-3 py-2 gap-2">
          <Text bold>
            {format(parseISO(item.day), 'EEEE d MMMM', { locale: dfLocale })}
          </Text>
          {item.events.map((event) => (
            <Pressable
              key={`${event.id}-${event.occurrenceStart}`}
              onPress={() => router.push(href(`/event/${event.id}`))}
              testID={`agenda-event-${event.id}`}
            >
              <Box className="rounded-lg bg-background-50 p-3 border border-outline-100">
                <Text bold>{event.title}</Text>
                <Text size="sm" className="text-typography-500">
                  {event.allDay
                    ? t('agenda')
                    : `${format(parseISO(event.occurrenceStart), 'HH:mm')} – ${format(parseISO(event.occurrenceEnd), 'HH:mm')}`}
                </Text>
              </Box>
            </Pressable>
          ))}
        </VStack>
      )}
    />
  );
}
