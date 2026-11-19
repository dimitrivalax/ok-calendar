import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parseISO, set } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, TextInput } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { dateFnsLocale } from '@/i18n';

type PickerMode = 'date' | 'time';

type Props = {
  label: string;
  value: string;
  onChange: (iso: string, part: PickerMode) => void;
  allDay: boolean;
  testID?: string;
};

function applyDatePart(current: Date, next: Date): Date {
  return set(current, {
    year: next.getFullYear(),
    month: next.getMonth(),
    date: next.getDate(),
  });
}

function applyTimePart(current: Date, next: Date): Date {
  return set(current, {
    hours: next.getHours(),
    minutes: next.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}

export function DateTimeField({
  label,
  value,
  onChange,
  allDay,
  testID,
}: Props) {
  const { t, i18n } = useTranslation('event');
  const dfLocale = dateFnsLocale(i18n.language);
  const date = parseISO(value);
  const [openMode, setOpenMode] = useState<PickerMode | null>(null);

  const emit = (next: Date, part: PickerMode) =>
    onChange(next.toISOString(), part);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpenMode(null);
    }
    if (event.type === 'dismissed' || !selected || openMode == null) return;

    if (openMode === 'date') {
      emit(applyDatePart(date, selected), 'date');
    } else {
      emit(applyTimePart(date, selected), 'time');
    }
  };

  if (Platform.OS === 'web') {
    return (
      <VStack className="gap-1" testID={testID}>
        <Text>{label}</Text>
        <HStack className="flex-wrap gap-2">
          <TextInput
            accessibilityLabel={t('date')}
            className="min-h-9 flex-1 rounded-md border border-border px-3 py-1 text-sm text-foreground"
            // @ts-expect-error web-only input type
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChangeText={(raw) => {
              if (!raw) return;
              const [y, m, d] = raw.split('-').map(Number);
              emit(set(date, { year: y, month: m - 1, date: d }), 'date');
            }}
          />
          {!allDay && (
            <TextInput
              accessibilityLabel={t('time')}
              className="min-h-9 w-32 rounded-md border border-border px-3 py-1 text-sm text-foreground"
              // @ts-expect-error web-only input type
              type="time"
              value={format(date, 'HH:mm')}
              onChangeText={(raw) => {
                if (!raw) return;
                const [hours, minutes] = raw.split(':').map(Number);
                emit(
                  set(date, { hours, minutes, seconds: 0, milliseconds: 0 }),
                  'time',
                );
              }}
            />
          )}
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack className="gap-1" testID={testID}>
      <Text>{label}</Text>
      <HStack className="flex-wrap gap-2 items-center">
        {Platform.OS === 'ios' ? (
          <>
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              locale={i18n.language}
              onChange={(_event, selected) => {
                if (selected) emit(applyDatePart(date, selected), 'date');
              }}
            />
            {!allDay && (
              <DateTimePicker
                value={date}
                mode="time"
                display="compact"
                locale={i18n.language}
                onChange={(_event, selected) => {
                  if (selected) emit(applyTimePart(date, selected), 'time');
                }}
              />
            )}
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setOpenMode('date')}
              accessibilityLabel={t('date')}
            >
              <ButtonText>
                {format(date, 'P', { locale: dfLocale })}
              </ButtonText>
            </Button>
            {!allDay && (
              <Button
                size="sm"
                variant="outline"
                onPress={() => setOpenMode('time')}
                accessibilityLabel={t('time')}
              >
                <ButtonText>
                  {format(date, 'p', { locale: dfLocale })}
                </ButtonText>
              </Button>
            )}
            {openMode != null && (
              <DateTimePicker
                value={date}
                mode={openMode}
                display="default"
                onChange={onPickerChange}
              />
            )}
          </>
        )}
      </HStack>
    </VStack>
  );
}
