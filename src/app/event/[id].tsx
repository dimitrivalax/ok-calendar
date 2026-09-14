import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { format, parseISO } from 'date-fns';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { CalendarEvent } from '@/domain/types';
import { safeUrl } from '@/domain/url';
import { EventRepository } from '@/services/eventRepository';
import { SyncEngine } from '@/services/syncEngine';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(['event', 'common']);
  const router = useRouter();
  const { refresh } = useCalendar();
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    void EventRepository.getById(id).then(setEvent);
  }, [id]);

  if (!event) {
    return (
      <Box className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </Box>
    );
  }

  const openUrl = async () => {
    const url = safeUrl(event.url);
    if (!url) return;
    await Linking.openURL(url);
  };

  const onDelete = () => {
    Alert.alert(t('event:deleteConfirm'), undefined, [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: async () => {
          await EventRepository.delete(event.id);
          await SyncEngine.pushEvent(event.id);
          await refresh();
          router.replace(href('/(calendar)'));
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1" testID="event-detail">
      <VStack className="p-4 gap-3">
        <Text size="2xl" bold>
          {event.title}
        </Text>
        <Text>
          {event.allDay
            ? format(parseISO(event.startAt), 'PPP')
            : `${format(parseISO(event.startAt), 'PPp')} – ${format(parseISO(event.endAt), 'PPp')}`}
        </Text>
        <Text>
          {t('event:recurrence')}: {event.recurrence}
        </Text>
        {event.location ? <Text>{event.location}</Text> : null}
        {event.description ? <Text>{event.description}</Text> : null}
        {event.url ? (
          <Button variant="link" onPress={openUrl}>
            <ButtonText>{event.url}</ButtonText>
          </Button>
        ) : null}
        {event.syncStatus !== 'synced' && (
          <Text size="sm" className="text-warning-600">
            sync: {event.syncStatus}
          </Text>
        )}
        <Button onPress={() => router.push(href(`/event/edit/${event.id}`))}>
          <ButtonText>{t('common:edit')}</ButtonText>
        </Button>
        <Button variant="destructive" onPress={onDelete}>
          <ButtonText>{t('common:delete')}</ButtonText>
        </Button>
      </VStack>
    </ScrollView>
  );
}
