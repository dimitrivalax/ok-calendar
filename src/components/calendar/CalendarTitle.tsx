import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, startOfDay } from 'date-fns';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, TextInput } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Text } from '@/components/ui/text';

type Props = {
  title: string;
  value: Date;
  onChange: (date: Date) => void;
  locale: string;
};

export function CalendarTitle({ title, value, onChange, locale }: Props) {
  const { t } = useTranslation(['calendar', 'common']);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const webInputRef = useRef<TextInput>(null);

  const apply = (date: Date) => {
    onChange(startOfDay(date));
    setPickerOpen(false);
  };

  const openPicker = () => {
    setDraft(value);
    if (Platform.OS === 'web') {
      const node = webInputRef.current as
        | (TextInput & { showPicker?: () => void; click?: () => void })
        | null;
      if (node?.showPicker) {
        node.showPicker();
      } else {
        node?.focus?.();
      }
      return;
    }
    setPickerOpen(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setPickerOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    apply(selected);
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={t('calendar:jumpToDate')}
        testID="calendar-title"
      >
        <Text bold size="lg" className="text-center" numberOfLines={2}>
          {title}
        </Text>
      </Pressable>

      {Platform.OS === 'web' ? (
        <TextInput
          ref={webInputRef}
          accessibilityLabel={t('calendar:jumpToDate')}
          className="absolute h-px w-px opacity-0"
          // @ts-expect-error web-only input type
          type="date"
          testID="calendar-title-date-input"
          value={format(value, 'yyyy-MM-dd')}
          onChangeText={(raw) => {
            if (!raw) return;
            const [y, m, d] = raw.split('-').map(Number);
            apply(new Date(y, m - 1, d));
          }}
        />
      ) : null}

      {Platform.OS === 'android' && pickerOpen ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          size="sm"
        >
          <ModalBackdrop onPress={() => setPickerOpen(false)} />
          <ModalContent>
            <ModalHeader>
              <Text bold>{t('calendar:jumpToDate')}</Text>
            </ModalHeader>
            <ModalBody>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                locale={locale}
                onChange={(_event, selected) => {
                  if (selected) setDraft(selected);
                }}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setPickerOpen(false)}
              >
                <ButtonText>{t('common:cancel')}</ButtonText>
              </Button>
              <Button size="sm" onPress={() => apply(draft)}>
                <ButtonText>{t('common:save')}</ButtonText>
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}
    </>
  );
}
