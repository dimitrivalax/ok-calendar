import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { addHours } from 'date-fns';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import type { CalendarEvent, Recurrence, ReminderType } from '@/domain/types';
import { isValidOptionalUrl } from '@/domain/url';

export type EventFormValues = {
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

export function EventForm({ initial, onSubmit, submitLabel }: Props) {
  const { t } = useTranslation('event');
  const defaultStart = initial?.startAt ?? new Date().toISOString();
  const defaultEnd =
    initial?.endAt ?? addHours(new Date(defaultStart), 1).toISOString();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues: {
      title: initial?.title ?? '',
      allDay: initial?.allDay ?? false,
      startAt: defaultStart,
      endAt: defaultEnd,
      recurrence: initial?.recurrence ?? 'none',
      description: initial?.description ?? '',
      location: initial?.location ?? '',
      url: initial?.url ?? '',
      reminderType: initial?.notifications?.[0]?.type ?? 'at_event',
      reminderValue: String(initial?.notifications?.[0]?.value ?? 10),
    },
  });

  const recurrence = watch('recurrence');

  useEffect(() => {
    // keep form controlled
  }, [recurrence]);

  return (
    <ScrollView testID="event-form" className="flex-1">
      <VStack className="p-4 gap-4">
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

        <VStack className="gap-1">
          <Text>{t('start')} (ISO)</Text>
          <Controller
            control={control}
            name="startAt"
            render={({ field: { onChange, value } }) => (
              <Input>
                <InputField value={value} onChangeText={onChange} />
              </Input>
            )}
          />
        </VStack>

        <VStack className="gap-1">
          <Text>{t('end')} (ISO)</Text>
          <Controller
            control={control}
            name="endAt"
            rules={{
              validate: (end, values) =>
                new Date(end) > new Date(values.startAt) || t('invalidRange'),
            }}
            render={({ field: { onChange, value } }) => (
              <Input>
                <InputField value={value} onChangeText={onChange} />
              </Input>
            )}
          />
          {errors.endAt && (
            <Text size="sm" className="text-error-500">
              {errors.endAt.message}
            </Text>
          )}
        </VStack>

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
            name="reminderType"
            render={({ field: { value, onChange } }) => (
              <HStack className="flex-wrap gap-2">
                {(
                  [
                    'at_event',
                    'minutes_before',
                    'hours_before',
                    'days_before',
                  ] as ReminderType[]
                ).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={value === type ? 'default' : 'outline'}
                    onPress={() => onChange(type)}
                  >
                    <ButtonText>{type}</ButtonText>
                  </Button>
                ))}
              </HStack>
            )}
          />
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
