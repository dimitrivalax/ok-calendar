import { addYears, endOfDay, startOfDay, subYears } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OccurrenceList } from '@/components/calendar/OccurrenceList';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import type { EventOccurrence } from '@/domain/types';
import { expandOccurrences } from '@/domain/recurrence';
import { EventRepository } from '@/services/eventRepository';

const DEBOUNCE_MS = 250;

function matchesQuery(occ: EventOccurrence, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const haystack = [occ.title, occ.location ?? '', occ.description ?? '']
    .join('\n')
    .toLowerCase();
  return haystack.includes(q);
}

type SearchResult = {
  query: string;
  occurrences: EventOccurrence[];
};

export default function SearchScreen() {
  const { t } = useTranslation(['calendar']);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [result, setResult] = useState<SearchResult>({
    query: '',
    occurrences: [],
  });

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return;

    void (async () => {
      const calendars = await EventRepository.listCalendars();
      const visibleIds = calendars.filter((c) => c.isVisible).map((c) => c.id);
      const now = new Date();
      const start = startOfDay(subYears(now, 1)).toISOString();
      const end = endOfDay(addYears(now, 2)).toISOString();
      const events = await EventRepository.listInRange(start, end, visibleIds);
      const expanded = expandOccurrences(events, start, end);
      if (!cancelled) {
        setResult({
          query: trimmed,
          occurrences: expanded.filter((occ) => matchesQuery(occ, trimmed)),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const trimmedQuery = debouncedQuery.trim();
  const occurrences =
    trimmedQuery && result.query === trimmedQuery ? result.occurrences : [];

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
