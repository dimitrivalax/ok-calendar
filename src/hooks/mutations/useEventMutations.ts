import { useMutation } from '@tanstack/react-query';

import type { CalendarEvent, CreateEventInput, SyncStatus } from '@/domain/types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { EventRepository } from '@/services/eventRepository';
import { SyncEngine } from '@/services/syncEngine';

export function useCreateEvent() {
  return useMutation<CalendarEvent, Error, CreateEventInput>({
    mutationFn: async (input) => {
      const created = await EventRepository.create(input);
      await SyncEngine.pushEvent(created.id);
      return (await EventRepository.getById(created.id)) ?? created;
    },
    onSuccess: async (created) => {
      queryClient.setQueryData(queryKeys.events.detail(created.id), created);
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

type UpdateEventVariables = {
  id: string;
  patch: Partial<CreateEventInput> & {
    syncStatus?: SyncStatus;
    deviceEventId?: string | null;
  };
};

export function useUpdateEvent() {
  return useMutation<CalendarEvent, Error, UpdateEventVariables>({
    mutationFn: async ({ id, patch }) => {
      const updated = await EventRepository.update(id, patch);
      await SyncEngine.pushEvent(id);
      return (await EventRepository.getById(id)) ?? updated;
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.events.detail(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export function useDeleteEvent() {
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await EventRepository.delete(id);
      await SyncEngine.pushEvent(id);
    },
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}
