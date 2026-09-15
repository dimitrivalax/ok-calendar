import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert } from 'react-native';

import { Box } from '@/components/ui/box';
import { EventForm, type EventFormValues } from '@/components/event/EventForm';
import type { CalendarEvent } from '@/domain/types';
import { EventRepository } from '@/services/eventRepository';
import { SyncEngine } from '@/services/syncEngine';
import { useCalendar } from '@/hooks/useCalendarContext';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('event');
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

  const onSubmit = async (values: EventFormValues) => {
    try {
      const reminderValue = Number(values.reminderValue) || 0;
      await EventRepository.update(event.id, {
        calendarId: values.calendarId,
        title: values.title,
        allDay: values.allDay,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        recurrence: values.recurrence,
        description: values.description || null,
        location: values.location || null,
        url: values.url || null,
        notifications: [
          {
            type: values.reminderType,
            value: values.reminderType === 'at_event' ? 0 : reminderValue,
          },
        ],
      });
      await SyncEngine.pushEvent(event.id);
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <EventForm
      initial={event}
      onSubmit={onSubmit}
      submitLabel={t('edit')}
    />
  );
}
