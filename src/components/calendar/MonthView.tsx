import { useMemo } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Pressable } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { EventOccurrence } from '@/domain/types';
import { useCalendar } from '@/hooks/useCalendarContext';
import { dateFnsLocale } from '@/i18n';

const MAX_BADGES_PER_DAY = 3;

type Props = {
  onSelectDay: (date: Date) => void;
};

export function MonthView({ onSelectDay }: Props) {
  const { cursorDate, occurrences, locale } = useCalendar();
  const dfLocale = dateFnsLocale(locale);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursorDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [cursorDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const occ of occurrences) {
      const key = format(new Date(occ.occurrenceStart), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    return map;
  }, [occurrences]);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), 'EE', {
      locale: dfLocale,
    }),
  );

  return (
    <VStack className="flex-1 p-2" testID="panel-month">
      <HStack className="mb-1">
        {weekDays.map((label) => (
          <Box key={label} className="flex-1 items-center py-1">
            <Text size="xs" className="text-muted-foreground">
              {label}
            </Text>
          </Box>
        ))}
      </HStack>
      {weeks.map((week, wi) => (
        <HStack key={wi} className="flex-1">
          {week.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, cursorDate);
            const isToday = isSameDay(day, new Date());
            const dayEvents = eventsByDay.get(key) ?? [];
            const visibleEvents = dayEvents.slice(0, MAX_BADGES_PER_DAY);
            const remainingCount = dayEvents.length - visibleEvents.length;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={format(day, 'PPP', { locale: dfLocale })}
                onPress={() => onSelectDay(day)}
                style={{ flex: 1, minWidth: 0 }}
                testID={`day-cell-${key}`}
              >
                <Box
                  className={`flex-1 m-0.5 rounded-md items-center pt-1 px-0.5 overflow-hidden ${
                    isToday
                      ? 'bg-muted border-2 border-primary'
                      : 'bg-muted'
                  }`}
                >
                  <Text
                    className={
                      inMonth ? 'text-foreground' : 'text-muted-foreground'
                    }
                    bold={isToday}
                  >
                    {format(day, 'd')}
                  </Text>
                  <VStack className="mt-0.5 w-full gap-0.5">
                    {visibleEvents.map((event) => (
                      <Badge
                        key={`${event.id}-${event.occurrenceStart}`}
                        variant="default"
                        className="w-full px-1 py-0.5 justify-start"
                      >
                        <BadgeText
                          className="normal-case text-[10px] leading-tight shrink"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {event.title}
                        </BadgeText>
                      </Badge>
                    ))}
                    {remainingCount > 0 && (
                      <Text
                        size="2xs"
                        className="text-muted-foreground text-center leading-tight"
                      >
                        +{remainingCount}
                      </Text>
                    )}
                  </VStack>
                </Box>
              </Pressable>
            );
          })}
        </HStack>
      ))}
    </VStack>
  );
}
