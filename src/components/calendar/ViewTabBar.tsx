import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { decorativeIconProps } from '@/components/ui/utils/decorative-icon';
import type { ViewMode } from '@/domain/types';
import { useCalendar } from '@/hooks/useCalendarContext';
import { href } from '@/navigation/href';

const MODES: ViewMode[] = ['month', 'week', 'day', 'agenda'];

export function ViewTabBar() {
  const { viewMode, setViewMode } = useCalendar();
  const { t } = useTranslation('calendar');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <HStack
      className="border-t border-border bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      testID="view-switcher"
    >
      <HStack
        className="min-w-0 flex-1"
        {...(Platform.OS === 'web'
          ? { role: 'tablist' }
          : { accessibilityRole: 'tablist' })}
      >
        {MODES.map((mode) => {
          const active = viewMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center justify-center py-3"
              onPress={() => setViewMode(mode)}
              testID={`view-${mode}`}
            >
              <Text
                size="sm"
                bold={active}
                className={
                  active ? 'text-primary-text' : 'text-muted-foreground'
                }
              >
                {t(mode)}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newEvent')}
        className="min-w-14 items-center justify-center px-3 py-3"
        onPress={() => router.push(href('/event/new'))}
        testID="fab-new-event"
      >
        <Plus size={22} color="#39AFEA" strokeWidth={2.5} {...decorativeIconProps} />
      </Pressable>
    </HStack>
  );
}
