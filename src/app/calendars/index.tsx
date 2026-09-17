import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Calendar } from '@/domain/types';
import { EventRepository } from '@/services/eventRepository';
import { CalendarService } from '@/services/calendarDevice';
import { useCalendar } from '@/hooks/useCalendarContext';

export default function CalendarsScreen() {
  const { t } = useTranslation('calendar');
  const { refresh } = useCalendar();
  const insets = useSafeAreaInsets();
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  const load = async () => {
    await CalendarService.syncDeviceCalendarsIntoDb();
    setCalendars(await EventRepository.listCalendars());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch calendars on mount
    void load();
  }, []);

  return (
    <VStack className="flex-1 bg-background p-4" testID="calendar-list">
      <Text size="xl" bold className="mb-3">
        {t('calendars')}
      </Text>
      <FlatList
        data={calendars}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) }}
        renderItem={({ item }) => (
          <HStack className="items-center justify-between py-3 border-b border-border">
            <HStack className="items-center gap-2 flex-1">
              <Box
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <VStack className="flex-1">
                <Text>{item.title}</Text>
                <Text size="xs" className="text-muted-foreground">
                  {item.source}
                  {!item.allowsModifications ? ' · read-only' : ''}
                </Text>
              </VStack>
            </HStack>
            <Switch
              value={item.isVisible}
              onValueChange={async (value: boolean) => {
                await EventRepository.updateCalendarVisibility(item.id, value);
                await load();
                await refresh();
              }}
            />
          </HStack>
        )}
      />
    </VStack>
  );
}
