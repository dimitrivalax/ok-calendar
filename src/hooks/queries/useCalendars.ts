import { useQuery } from '@tanstack/react-query';

import type { Calendar } from '@/domain/types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { EventRepository } from '@/services/eventRepository';

export function useCalendars() {
  return useQuery<Calendar[]>({
    queryKey: queryKeys.calendars.all,
    queryFn: () => EventRepository.listCalendars(),
  });
}

export function useWritableCalendars() {
  return useQuery<Calendar[], Error, Calendar[]>({
    queryKey: queryKeys.calendars.all,
    queryFn: () => EventRepository.listCalendars(),
    select: (calendars) => calendars.filter((c) => c.allowsModifications),
  });
}
