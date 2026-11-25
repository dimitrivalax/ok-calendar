import { useQuery } from '@tanstack/react-query';
import { addYears, endOfDay, startOfDay, subYears } from 'date-fns';
import { useMemo } from 'react';

import { expandOccurrences } from '@/domain/recurrence';
import type { EventOccurrence } from '@/domain/types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useCalendars } from '@/hooks/queries/useCalendars';
import { EventRepository } from '@/services/eventRepository';

const EMPTY_OCCURRENCES: EventOccurrence[] = [];

function matchesQuery(occ: EventOccurrence, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const haystack = [occ.title, occ.location ?? '', occ.description ?? '']
    .join('\n')
    .toLowerCase();
  return haystack.includes(q);
}

export function useSearchEvents(rawQuery: string) {
  const trimmed = rawQuery.trim();
  const calendarsQuery = useCalendars();

  const visibleIds = useMemo(
    () => (calendarsQuery.data ?? []).filter((c) => c.isVisible).map((c) => c.id),
    [calendarsQuery.data],
  );
  const visibleIdsKey = useMemo(() => visibleIds.join(','), [visibleIds]);

  const corpusQuery = useQuery<EventOccurrence[]>({
    queryKey: queryKeys.events.searchCorpus(visibleIdsKey),
    queryFn: async () => {
      const now = new Date();
      const start = startOfDay(subYears(now, 1)).toISOString();
      const end = endOfDay(addYears(now, 2)).toISOString();
      const events = await EventRepository.listInRange(start, end, visibleIds);
      return expandOccurrences(events, start, end);
    },
    enabled: trimmed.length > 0 && calendarsQuery.isSuccess,
  });

  const occurrences = useMemo(() => {
    if (!trimmed || !corpusQuery.data) return EMPTY_OCCURRENCES;
    return corpusQuery.data.filter((occ) => matchesQuery(occ, trimmed));
  }, [trimmed, corpusQuery.data]);

  return {
    ...corpusQuery,
    occurrences,
  };
}
