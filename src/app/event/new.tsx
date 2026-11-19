import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { EventForm, type EventFormValues } from '@/components/event/EventForm';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';
import { EventRepository } from '@/services/eventRepository';
import {
  clearIcsImportPayload,
  getIcsImportPayload,
  type IcsImportErrorCode,
} from '@/services/icsImportDraft';
import { SyncEngine } from '@/services/syncEngine';

const ICS_ERROR_KEYS: Record<
  IcsImportErrorCode,
  | 'icsImportErrorRead'
  | 'icsImportErrorTooLarge'
  | 'icsImportErrorInvalid'
  | 'icsImportErrorNoEvents'
  | 'icsImportErrorMissingStart'
> = {
  read_failed: 'icsImportErrorRead',
  file_too_large: 'icsImportErrorTooLarge',
  invalid_ics: 'icsImportErrorInvalid',
  no_events: 'icsImportErrorNoEvents',
  missing_start: 'icsImportErrorMissingStart',
};

export default function NewEventScreen() {
  const { importId } = useLocalSearchParams<{ importId?: string }>();
  const { t } = useTranslation('event');
  const router = useRouter();
  const { refresh, setCursorDate } = useCalendar();

  const importPayload = getIcsImportPayload(importId);
  const initialDraft = importPayload?.ok ? importPayload.draft : undefined;

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
      if (importPayload?.ok) {
        setCursorDate(new Date(created.startAt));
      }
      clearIcsImportPayload(importId);
      if (router.canGoBack()) {
        router.replace(href(`/event/${created.id}`));
      } else {
        router.replace(href('/(calendar)'));
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Box className="flex-1 bg-background">
      {importPayload && !importPayload.ok && (
        <Box
          testID="ics-import-error"
          className="mx-4 mt-3 rounded-md border border-destructive bg-muted px-3 py-2"
        >
          <Text size="sm" className="text-destructive">
            {t(ICS_ERROR_KEYS[importPayload.error])}
          </Text>
        </Box>
      )}

      {importPayload?.ok &&
        (importPayload.totalEvents > 1 || importPayload.unsupportedRecurrence) && (
          <VStack
            testID="ics-import-notice"
            className="mx-4 mt-3 gap-1 rounded-md border border-border bg-secondary px-3 py-2"
          >
            {importPayload.totalEvents > 1 && (
              <Text size="sm" className="text-secondary-foreground">
                {t('icsImportMultipleNotice', {
                  count: importPayload.totalEvents,
                })}
              </Text>
            )}
            {importPayload.unsupportedRecurrence && (
              <Text size="sm" className="text-secondary-foreground">
                {t('icsImportRecurrenceNotice')}
              </Text>
            )}
          </VStack>
        )}

      <EventForm
        key={importId ?? 'new'}
        initial={initialDraft}
        onSubmit={onSubmit}
        submitLabel={t('create')}
      />
    </Box>
  );
}
