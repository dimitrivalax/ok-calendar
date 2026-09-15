import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { EventForm, type EventFormValues } from '@/components/event/EventForm';
import { EventRepository } from '@/services/eventRepository';
import { SyncEngine } from '@/services/syncEngine';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

export default function NewEventScreen() {
  const { t } = useTranslation('event');
  const router = useRouter();
  const { refresh } = useCalendar();

  const onSubmit = async (values: EventFormValues) => {
    try {
      const reminderValue = Number(values.reminderValue) || 0;
      const created = await EventRepository.create({
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

      await SyncEngine.pushEvent(created.id);
      await refresh();
      router.replace(href(`/event/${created.id}`));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <EventForm onSubmit={onSubmit} submitLabel={t('create')} />
  );
}
