import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import {
  rangeForView,
  shiftDateByView,
  windowForCursor,
} from '@/domain/calendarWindow';
import { expandOccurrences } from '@/domain/recurrence';
import type { CalendarEvent, EventOccurrence, ViewMode } from '@/domain/types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useCalendars } from '@/hooks/queries/useCalendars';
import { queryClient } from '@/lib/queryClient';
import { useCursorDate, useViewMode } from '@/state/calendarStore';
import { EventRepository } from '@/services/eventRepository';

const EMPTY_EVENTS: CalendarEvent[] = [];

export function useEventsInWindow(cursorDate: Date, viewMode: ViewMode) {
  const calendarsQuery = useCalendars();

  const visibleIds = useMemo(
    () => (calendarsQuery.data ?? []).filter((c) => c.isVisible).map((c) => c.id),
    [calendarsQuery.data],
  );
  const visibleIdsKey = useMemo(() => visibleIds.join(','), [visibleIds]);

  const windowRange = useMemo(() => windowForCursor(cursorDate), [cursorDate]);

  const eventsQuery = useQuery<CalendarEvent[]>({
    queryKey: queryKeys.events.window(
      windowRange.start,
      windowRange.end,
      visibleIdsKey,
    ),
    queryFn: () =>
      EventRepository.listInRange(
        windowRange.start,
        windowRange.end,
        visibleIds,
      ),
    enabled: calendarsQuery.isSuccess,
    placeholderData: keepPreviousData,
  });

  // Prefetch adjacent periods so swiping between periods renders immediately.
  useEffect(() => {
    if (!calendarsQuery.isSuccess) return;
    for (const delta of [-1, 1] as const) {
      const adjacentDate = shiftDateByView(cursorDate, viewMode, delta);
      const adjacentWindow = windowForCursor(adjacentDate);
      if (
        adjacentWindow.start === windowRange.start &&
        adjacentWindow.end === windowRange.end
      ) {
        continue;
      }
      void queryClient.prefetchQuery({
        queryKey: queryKeys.events.window(
          adjacentWindow.start,
          adjacentWindow.end,
          visibleIdsKey,
        ),
        queryFn: () =>
          EventRepository.listInRange(
            adjacentWindow.start,
            adjacentWindow.end,
            visibleIds,
          ),
      });
    }
  }, [
    calendarsQuery.isSuccess,
    cursorDate,
    viewMode,
    windowRange.start,
    windowRange.end,
    visibleIds,
    visibleIdsKey,
  ]);

  const viewRange = useMemo(
    () => rangeForView(viewMode, cursorDate),
    [viewMode, cursorDate],
  );

  const events = eventsQuery.data ?? EMPTY_EVENTS;

  const occurrences: EventOccurrence[] = useMemo(
    () => expandOccurrences(events, viewRange.start, viewRange.end),
    [events, viewRange.start, viewRange.end],
  );

  return {
    ...eventsQuery,
    events,
    occurrences,
  };
}

export function useCalendarOccurrences(): EventOccurrence[] {
  const cursorDate = useCursorDate();
  const viewMode = useViewMode();
  return useEventsInWindow(cursorDate, viewMode).occurrences;
}
