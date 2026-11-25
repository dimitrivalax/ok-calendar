import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert } from 'react-native';

import { Box } from '@/components/ui/box';
import { EventForm, type EventFormValues } from '@/components/event/EventForm';
import { useUpdateEvent } from '@/hooks/mutations/useEventMutations';
import { useEvent } from '@/hooks/queries/useEvent';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('event');
  const router = useRouter();
  const { data: event } = useEvent(id);
  const updateEvent = useUpdateEvent();

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
      await updateEvent.mutateAsync({
        id: event.id,
        patch: {
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
        },
      });
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
