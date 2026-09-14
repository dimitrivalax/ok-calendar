import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Pressable } from 'react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendar } from '@/hooks/useCalendarContext';

type Props = {
  onSelectMonth: (date: Date) => void;
};

export function YearView({ onSelectMonth }: Props) {
  const { cursorDate, locale } = useCalendar();
  const dfLocale = locale === 'fr' ? fr : enUS;
  const year = cursorDate.getFullYear();

  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <VStack className="flex-1 p-3 gap-2" testID="view-year">
      <HStack className="flex-wrap">
        {months.map((month) => (
          <Pressable
            key={month.toISOString()}
            onPress={() => onSelectMonth(month)}
            style={{ width: '33.33%', padding: 4 }}
            accessibilityRole="button"
            testID={`month-cell-${format(month, 'yyyy-MM')}`}
          >
            <Box className="rounded-lg bg-background-50 p-3 items-center">
              <Text bold>
                {format(month, 'MMM', { locale: dfLocale })}
              </Text>
            </Box>
          </Pressable>
        ))}
      </HStack>
    </VStack>
  );
}
