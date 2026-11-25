import { useQuery } from '@tanstack/react-query';

import type { CalendarEvent } from '@/domain/types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { EventRepository } from '@/services/eventRepository';

export function useEvent(id: string | undefined) {
  return useQuery<CalendarEvent | null>({
    queryKey: queryKeys.events.detail(id ?? ''),
    queryFn: () => EventRepository.getById(id!),
    enabled: Boolean(id),
  });
}
