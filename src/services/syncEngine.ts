import { Platform } from 'react-native';
import { addMonths, subMonths } from 'date-fns';

import { EventRepository } from '@/services/eventRepository';
import { CalendarService } from '@/services/calendarDevice';
import { NotificationService } from '@/services/notificationService';
import { getDb } from '@/db/client';

function defaultRange() {
  const now = new Date();
  return {
    start: subMonths(now, 12).toISOString(),
    end: addMonths(now, 24).toISOString(),
  };
}

/**
 * Best-effort sync engine.
 * Full EventKit write path uses expo-calendar when available;
 * web stays local-only with mock calendars.
 */
export const SyncEngine = {
  async pull(range = defaultRange()): Promise<void> {
    await CalendarService.syncDeviceCalendarsIntoDb();

    if (Platform.OS === 'web') return;

    try {
      const Calendar = await import('expo-calendar/legacy');
      const permission = await Calendar.getCalendarPermissionsAsync();
      if (!permission.granted) return;

      const calendars = await EventRepository.listCalendars();
      const deviceCalendars = calendars.filter(
        (c) => c.source === 'device' && c.syncEnabled && c.deviceCalendarId,
      );
      if (deviceCalendars.length === 0) return;

      const events = await Calendar.getEventsAsync(
        deviceCalendars.map((c) => c.deviceCalendarId!),
        new Date(range.start),
        new Date(range.end),
      );

      const db = await getDb();
      for (const deviceEvent of events) {
        const mappedCal = deviceCalendars.find(
          (c) => c.deviceCalendarId === deviceEvent.calendarId,
        );
        if (!mappedCal) continue;

        const existing = await db.getFirstAsync<{ id: string }>(
          `SELECT local_event_id as id FROM sync_map WHERE device_event_id = ?`,
          deviceEvent.id,
        );

        const startAt = new Date(deviceEvent.startDate).toISOString();
        const endAt = new Date(deviceEvent.endDate).toISOString();
        const title = deviceEvent.title || '(No title)';

        if (existing) {
          const local = await EventRepository.getById(existing.id);
          if (!local) continue;
          const deviceMod = deviceEvent.lastModifiedDate
            ? new Date(deviceEvent.lastModifiedDate).getTime()
            : 0;
          const localMod = new Date(local.updatedAt).getTime();
          if (deviceMod >= localMod) {
            await EventRepository.update(local.id, {
              title,
              startAt,
              endAt,
              allDay: !!deviceEvent.allDay,
              description: deviceEvent.notes ?? null,
              location: deviceEvent.location ?? null,
              url: deviceEvent.url ?? null,
              syncStatus: 'synced',
              deviceEventId: deviceEvent.id,
            });
          }
        } else {
          const created = await EventRepository.create({
            calendarId: mappedCal.id,
            title,
            allDay: !!deviceEvent.allDay,
            startAt,
            endAt,
            recurrence: 'none',
            description: deviceEvent.notes ?? null,
            location: deviceEvent.location ?? null,
            url: deviceEvent.url ?? null,
            origin: 'device',
            notifications: [],
          });
          await EventRepository.update(created.id, {
            syncStatus: 'synced',
            deviceEventId: deviceEvent.id,
          });
          await db.runAsync(
            `INSERT OR REPLACE INTO sync_map (
              local_event_id, device_event_id, device_calendar_id, last_synced_at
            ) VALUES (?, ?, ?, ?)`,
            created.id,
            deviceEvent.id,
            mappedCal.deviceCalendarId!,
            new Date().toISOString(),
          );
        }
      }
    } catch {
      // Device calendar unavailable — stay local-only
    }
  },

  async pushEvent(localEventId: string): Promise<void> {
    const event = await EventRepository.getById(localEventId);
    if (!event) return;

    if (event.deletedAt) {
      if (Platform.OS !== 'web' && event.deviceEventId) {
        try {
          const Calendar = await import('expo-calendar/legacy');
          await Calendar.deleteEventAsync(event.deviceEventId);
        } catch {
          /* ignore */
        }
      }
      await EventRepository.purgeDeleted(localEventId);
      await NotificationService.cancelForEvent(localEventId);
      return;
    }

    if (Platform.OS === 'web' || event.origin === 'device') {
      await EventRepository.update(event.id, { syncStatus: 'synced' });
      await NotificationService.syncForEvent(event.id);
      return;
    }

    try {
      const Calendar = await import('expo-calendar/legacy');
      const permission = await Calendar.getCalendarPermissionsAsync();
      if (!permission.granted) {
        await EventRepository.update(event.id, { syncStatus: 'pending' });
        await NotificationService.syncForEvent(event.id);
        return;
      }

      const calendars = await EventRepository.listCalendars();
      const cal = calendars.find((c) => c.id === event.calendarId);
      const deviceCalendarId =
        cal?.deviceCalendarId ??
        (await Calendar.getDefaultCalendarAsync()).id;

      const alarms = event.notifications.map((r) => {
        if (r.type === 'at_event') return { relativeOffset: 0 };
        if (r.type === 'minutes_before') return { relativeOffset: -r.value };
        if (r.type === 'hours_before') return { relativeOffset: -r.value * 60 };
        return { relativeOffset: -r.value * 60 * 24 };
      });

      const payload = {
        title: event.title,
        startDate: new Date(event.startAt),
        endDate: new Date(event.endAt),
        allDay: event.allDay,
        notes: event.description ?? undefined,
        location: event.location ?? undefined,
        url: event.url ?? undefined,
        alarms,
        timeZone: undefined as string | undefined,
      };

      let deviceEventId = event.deviceEventId;
      if (deviceEventId) {
        await Calendar.updateEventAsync(deviceEventId, payload);
      } else {
        deviceEventId = await Calendar.createEventAsync(deviceCalendarId, payload);
      }

      const db = await getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO sync_map (
          local_event_id, device_event_id, device_calendar_id, last_synced_at
        ) VALUES (?, ?, ?, ?)`,
        event.id,
        deviceEventId,
        deviceCalendarId,
        new Date().toISOString(),
      );

      await EventRepository.update(event.id, {
        syncStatus: 'synced',
        deviceEventId,
      });
    } catch {
      await EventRepository.update(event.id, { syncStatus: 'error' });
    }

    await NotificationService.syncForEvent(event.id);
  },

  async pushAllPending(): Promise<void> {
    const pending = await EventRepository.listPending();
    for (const event of pending) {
      await this.pushEvent(event.id);
    }
  },
};
