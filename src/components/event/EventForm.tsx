import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { addHours } from 'date-fns';
import { ChevronDown } from 'lucide-react-native';

import { DateTimeField } from '@/components/event/DateTimeField';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import type {
  Calendar,
  CalendarEvent,
  Recurrence,
  ReminderType,
} from '@/domain/types';
import { isValidOptionalUrl } from '@/domain/url';
import { EventRepository } from '@/services/eventRepository';

export type EventFormValues = {
  calendarId: string;
  title: string;
  allDay: boolean;
  startAt: string;
  endAt: string;
  recurrence: Recurrence;
  description: string;
  location: string;
  url: string;
  reminderType: ReminderType;
  reminderValue: string;
};

type Props = {
  initial?: Partial<CalendarEvent>;
  onSubmit: (values: EventFormValues) => Promise<void>;
  submitLabel: string;
};

const RECURRENCES: Recurrence[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

const REMINDER_TYPES: ReminderType[] = [
  // 'at_event',
  'minutes_before',
  'hours_before',
  'days_before',
];

const REMINDER_TYPE_LABELS: Record<
  ReminderType,
  | 'reminderAtEvent'
  | 'reminderMinutesBefore'
  | 'reminderHoursBefore'
  | 'reminderDaysBefore'
> = {
  at_event: 'reminderAtEvent',
  minutes_before: 'reminderMinutesBefore',
  hours_before: 'reminderHoursBefore',
  days_before: 'reminderDaysBefore',
};

export function EventForm({ initial, onSubmit, submitLabel }: Props) {
  const { t } = useTranslation('event');
  const defaultStart = initial?.startAt ?? new Date().toISOString();
  const defaultEnd =
    initial?.endAt ?? addHours(new Date(defaultStart), 1).toISOString();
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues: {
      calendarId: initial?.calendarId ?? '',
      title: initial?.title ?? '',
      allDay: initial?.allDay ?? false,
      startAt: defaultStart,
      endAt: defaultEnd,
      recurrence: initial?.recurrence ?? 'none',
      description: initial?.description ?? '',
      location: initial?.location ?? '',
      url: initial?.url ?? '',
      reminderType: initial?.notifications?.[0]?.type ?? 'minutes_before',
      reminderValue: String(initial?.notifications?.[0]?.value ?? 5),
    },
  });

  const recurrence = watch('recurrence');
  const allDay = watch('allDay');
  const calendarId = watch('calendarId');
  const selectedCalendar = calendars.find((c) => c.id === calendarId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await EventRepository.listCalendars();
      const writable = all.filter((c) => c.allowsModifications);
      if (cancelled) return;
      setCalendars(writable);
      const preferred =
        (initial?.calendarId &&
          writable.find((c) => c.id === initial.calendarId)?.id) ||
        writable.find((c) => c.isPrimary)?.id ||
        writable[0]?.id ||
        '';
      if (preferred) {
        setValue('calendarId', preferred);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.calendarId, setValue]);

  useEffect(() => {
    // keep form controlled
  }, [recurrence]);

  const selectCalendar = (id: string, onChange: (id: string) => void) => {
    onChange(id);
    void EventRepository.setPrimaryCalendar(id);
  };

  return (
    <ScrollView testID="event-form" className="flex-1">
      <VStack className="p-4 gap-4">
        <VStack className="gap-1">
          <Text>{t('calendar')}</Text>
          <Controller
            control={control}
            name="calendarId"
            rules={{ required: t('calendarRequired') }}
            render={({ field: { onChange, value } }) => (
              <Select
                selectedValue={value || undefined}
                selectedLabel={selectedCalendar?.title}
                onValueChange={(id) => selectCalendar(id, onChange)}
              >
                <SelectTrigger
                  variant="outline"
                  size="md"
                  testID="event-calendar-select"
                  className="gap-2 px-3"
                >
                  {selectedCalendar && (
                    <Box
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCalendar.color }}
                    />
                  )}
                  <Text className="flex-1 text-foreground" isTruncated>
                    {selectedCalendar?.title ?? t('calendar')}
                  </Text>
                  <SelectIcon as={ChevronDown} className="mr-1" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    {calendars.map((cal) => (
                      <SelectItem
                        key={cal.id}
                        label={cal.title}
                        value={cal.id}
                      />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            )}
          />
          {errors.calendarId && (
            <Text size="sm" className="text-error-500">
              {errors.calendarId.message}
            </Text>
          )}
        </VStack>

        <VStack className="gap-1">
          <Text>{t('title')}</Text>
          <Controller
            control={control}
            name="title"
            rules={{
              required: t('titleRequired'),
              maxLength: 200,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input>
                <InputField
                  testID="event-title-input"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t('title')}
                />
              </Input>
            )}
          />
          {errors.title && (
            <Text size="sm" className="text-error-500">
              {errors.title.message}
            </Text>
          )}
        </VStack>

        <HStack className="items-center justify-between">
          <Text>{t('allDay')}</Text>
          <Controller
            control={control}
            name="allDay"
            render={({ field: { value, onChange } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </HStack>

        <Controller
          control={control}
          name="startAt"
          render={({ field: { onChange, value } }) => (
            <DateTimeField
              testID="event-start-at"
              label={t('start')}
              value={value}
              onChange={onChange}
              allDay={allDay}
            />
          )}
        />

        <Controller
          control={control}
          name="endAt"
          rules={{
            validate: (end, values) =>
              new Date(end) > new Date(values.startAt) || t('invalidRange'),
          }}
          render={({ field: { onChange, value } }) => (
            <DateTimeField
              testID="event-end-at"
              label={t('end')}
              value={value}
              onChange={onChange}
              allDay={allDay}
            />
          )}
        />
        {errors.endAt && (
          <Text size="sm" className="text-error-500">
            {errors.endAt.message}
          </Text>
        )}

        <VStack className="gap-2">
          <Text>{t('recurrence')}</Text>
          <HStack className="flex-wrap gap-2">
            {RECURRENCES.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={recurrence === item ? 'default' : 'outline'}
                onPress={() => setValue('recurrence', item)}
              >
                <ButtonText>
                  {t(
                    `recurrence${item.charAt(0).toUpperCase()}${item.slice(1)}` as
                    | 'recurrenceNone'
                    | 'recurrenceDaily'
                    | 'recurrenceWeekly'
                    | 'recurrenceMonthly'
                    | 'recurrenceYearly',
                  )}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        </VStack>

        <VStack className="gap-1">
          <Text>{t('description')}</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Textarea>
                <TextareaInput value={value} onChangeText={onChange} />
              </Textarea>
            )}
          />
        </VStack>

        <VStack className="gap-1">
          <Text>{t('location')}</Text>
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <Input>
                <InputField value={value} onChangeText={onChange} />
              </Input>
            )}
          />
        </VStack>

        <VStack className="gap-1">
          <Text>{t('url')}</Text>
          <Controller
            control={control}
            name="url"
            rules={{
              validate: (v) => isValidOptionalUrl(v) || t('invalidUrl'),
            }}
            render={({ field: { onChange, value } }) => (
              <Input>
                <InputField
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </Input>
            )}
          />
          {errors.url && (
            <Text size="sm" className="text-error-500">
              {errors.url.message}
            </Text>
          )}
        </VStack>

        <Box className="gap-2">
          <Text bold>{t('reminders')}</Text>
          <Controller
            control={control}
            name="reminderValue"
            render={({ field: { onChange, value } }) => (
              <Input>
                <InputField
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                />
              </Input>
            )}
          />
          <Controller
            control={control}
            name="reminderType"
            render={({ field: { value, onChange } }) => (
              <HStack className="flex-wrap gap-2">
                {REMINDER_TYPES.map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={value === type ? 'default' : 'outline'}
                    onPress={() => onChange(type)}
                  >
                    <ButtonText>{t(REMINDER_TYPE_LABELS[type])}</ButtonText>
                  </Button>
                ))}
              </HStack>
            )}
          />
        </Box>

        <Button
          testID="btn-save-event"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <ButtonText>{submitLabel}</ButtonText>
        </Button>
      </VStack>
    </ScrollView>
  );
}
