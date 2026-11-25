import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { safeUrl } from '@/domain/url';
import { useDeleteEvent } from '@/hooks/mutations/useEventMutations';
import { useCalendars } from '@/hooks/queries/useCalendars';
import { useEvent } from '@/hooks/queries/useEvent';
import { dateFnsLocale } from '@/i18n';
import { href } from '@/navigation/href';
import { useLocale } from '@/state/calendarStore';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(['event', 'common']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useLocale();
  const dfLocale = dateFnsLocale(locale);
  const { data: event } = useEvent(id);
  const { data: calendars = [] } = useCalendars();
  const deleteEvent = useDeleteEvent();

  if (!event) {
    return (
      <Box className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </Box>
    );
  }

  const calendar = calendars.find((c) => c.id === event.calendarId) ?? null;

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
          await deleteEvent.mutateAsync(event.id);
          router.replace(href('/(calendar)'));
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1"
      testID="event-detail"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <VStack className="p-4 gap-3">
        <Text size="2xl" bold>
          {event.title}
        </Text>
        {calendar ? (
          <HStack className="items-center gap-2" testID="event-detail-calendar">
            <Box
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: calendar.color }}
            />
            <Text>
              {t('event:calendar')}: {calendar.title}
            </Text>
          </HStack>
        ) : null}
        <Text>
          {event.allDay
            ? format(parseISO(event.startAt), 'PPP', { locale: dfLocale })
            : `${format(parseISO(event.startAt), 'PPp', { locale: dfLocale })} – ${format(parseISO(event.endAt), 'PPp', { locale: dfLocale })}`}
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
