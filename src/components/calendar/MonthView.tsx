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
import { enUS, fr } from 'date-fns/locale';
import { Pressable, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';

type Props = {
  onSelectDay: (date: Date) => void;
};

export function MonthView({ onSelectDay }: Props) {
  const { cursorDate, occurrences, locale } = useCalendar();
  const dfLocale = locale === 'fr' ? fr : enUS;

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

  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const occ of occurrences) {
      const key = format(new Date(occ.occurrenceStart), 'yyyy-MM-dd');
      const colors = map.get(key) ?? [];
      if (colors.length < 3) colors.push('#208AEF');
      map.set(key, colors);
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
            <Text size="xs" className="text-typography-500">
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
            const dots = dotsByDay.get(key) ?? [];
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={format(day, 'PPP', { locale: dfLocale })}
                onPress={() => onSelectDay(day)}
                style={{ flex: 1 }}
                testID={`day-cell-${key}`}
              >
                <Box
                  className={`flex-1 m-0.5 rounded-md items-center pt-1 ${
                    isToday ? 'bg-primary-500/20' : 'bg-background-50'
                  }`}
                >
                  <Text
                    className={
                      inMonth ? 'text-typography-900' : 'text-typography-300'
                    }
                    bold={isToday}
                  >
                    {format(day, 'd')}
                  </Text>
                  <HStack className="mt-1 gap-0.5">
                    {dots.map((color, i) => (
                      <View
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: color,
                        }}
                      />
                    ))}
                  </HStack>
                </Box>
              </Pressable>
            );
          })}
        </HStack>
      ))}
      </VStack>
  );
}
