import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OccurrenceList } from '@/components/calendar/OccurrenceList';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { useSearchEvents } from '@/hooks/queries/useSearchEvents';

const DEBOUNCE_MS = 250;

export default function SearchScreen() {
  const { t } = useTranslation(['calendar']);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const trimmedQuery = debouncedQuery.trim();
  const { occurrences } = useSearchEvents(debouncedQuery);

  const emptyMessage = useMemo(() => {
    if (!trimmedQuery) return '';
    return t('calendar:noSearchResults');
  }, [trimmedQuery, t]);

  return (
    <VStack className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <VStack className="px-3 py-3">
        <Input>
          <InputField
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder={t('calendar:searchPlaceholder')}
            accessibilityLabel={t('calendar:search')}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </Input>
      </VStack>
      {trimmedQuery ? (
        <OccurrenceList
          occurrences={occurrences}
          emptyMessage={emptyMessage}
          testID="panel-search"
          scrollToFirstFuture
        />
      ) : null}
    </VStack>
  );
}
