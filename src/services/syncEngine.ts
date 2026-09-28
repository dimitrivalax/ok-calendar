import { Platform } from 'react-native';
import { addMonths, subMonths } from 'date-fns';

import { safeUrl } from '@/domain/url';
import { EventRepository } from '@/services/eventRepository';
import { CalendarService } from '@/services/calendarDevice';
import { alarmsToReminders } from '@/services/deviceAlarms';
import {
  deviceOccurrenceKey,
  normalizeEventRange,
  toEventIso,
} from '@/services/deviceEventKey';
import { NotificationService } from '@/services/notificationService';
import { getDb } from '@/db/client';

function defaultRange() {
  const now = new Date();
  // Android Instances queries become unreliable / throw on very wide windows.
  // Keep a practical horizon and page by month inside pull().
  return {
    start: subMonths(now, 3).toISOString(),
    end: addMonths(now, 6).toISOString(),
  };
}

function* monthWindows(start: Date, end: Date): Generator<{ start: Date; end: Date }> {
  let cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    const windowStart = new Date(cursor);
    const windowEnd = addMonths(windowStart, 1);
    yield {
      start: windowStart < start ? start : windowStart,
      end: windowEnd > end ? end : windowEnd,
    };
    cursor = windowEnd;
  }
}

async function findExistingLocalId(
  occurrenceKey: string,
  deviceEventId: string,
  startAt: string,
): Promise<string | null> {
  const db = await getDb();
  const byKey = await db.getFirstAsync<{ id: string }>(
    `SELECT sm.local_event_id as id
     FROM sync_map sm
     INNER JOIN events e ON e.id = sm.local_event_id
     WHERE sm.device_event_id = ? AND e.deleted_at IS NULL`,
    occurrenceKey,
  );
  if (byKey) return byKey.id;

  // Android Instance._ID often changes after Google edits; rematch by OS event id.
  const candidates = await db.getAllAsync<{ id: string; start_at: string }>(
    `SELECT id, start_at FROM events
     WHERE device_event_id = ? AND deleted_at IS NULL AND origin = 'device'`,
    deviceEventId,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  const exactStart = candidates.find((c) => c.start_at === startAt);
  return exactStart?.id ?? null;
}

async function upsertSyncMap(
  localEventId: string,
  occurrenceKey: string,
  deviceCalendarId: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_map (
      local_event_id, device_event_id, device_calendar_id, last_synced_at
    ) VALUES (?, ?, ?, ?)`,
    localEventId,
    occurrenceKey,
    deviceCalendarId,
    new Date().toISOString(),
  );
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

      // Fetch per calendar + per month so one bad native row / wide query cannot
      // abort the entire pull (Android wraps any error as "Events could not be found").
      const events: Awaited<ReturnType<typeof Calendar.getEventsAsync>> = [];
      const rangeStart = new Date(range.start);
      const rangeEnd = new Date(range.end);
      // Only purge disappearances for calendars whose every month window succeeded.
      const completeCalendarIds = new Set<string>();
      console.warn(
        `[SyncEngine] pulling ${deviceCalendars.length} calendars ${rangeStart.toISOString()} → ${rangeEnd.toISOString()}`,
      );
      for (const cal of deviceCalendars) {
        let calendarCount = 0;
        let fetchFailed = false;
        for (const window of monthWindows(rangeStart, rangeEnd)) {
          try {
            const batch = await Calendar.getEventsAsync(
              [String(cal.deviceCalendarId)],
              window.start,
              window.end,
            );
            calendarCount += batch.length;
            events.push(...batch);
          } catch (error) {
            fetchFailed = true;
            console.warn(
              '[SyncEngine] getEventsAsync failed',
              cal.title,
              cal.deviceCalendarId,
              window.start.toISOString(),
              error,
            );
          }
        }
        if (!fetchFailed) {
          completeCalendarIds.add(cal.id);
        }
        if (calendarCount > 0) {
          console.warn(
            `[SyncEngine] calendar ${cal.title} (${cal.deviceCalendarId}) → ${calendarCount} events`,
          );
        }
      }
      console.warn(`[SyncEngine] total device events fetched ${events.length}`);

      const db = await getDb();
      // Legacy sync_map keys were bare OS event ids, which collapsed recurring
      // instances into one row. Drop them so occurrences re-import correctly.
      const staleMaps = await db.getAllAsync<{ local_event_id: string }>(
        `SELECT local_event_id FROM sync_map
         WHERE device_event_id NOT LIKE 'evt:%'
           AND device_event_id NOT LIKE 'inst:%'`,
      );
      for (const row of staleMaps) {
        await EventRepository.purgeDeleted(row.local_event_id);
      }

      const seenKeys = new Set<string>();

      for (const deviceEvent of events) {
        try {
          const mappedCal = deviceCalendars.find(
            (c) => String(c.deviceCalendarId) === String(deviceEvent.calendarId),
          );
          if (!mappedCal || !deviceEvent.id) continue;

          const occurrenceKey = deviceOccurrenceKey(deviceEvent);
          seenKeys.add(occurrenceKey);

          const { startAt, endAt } = normalizeEventRange(
            toEventIso(deviceEvent.startDate),
            toEventIso(deviceEvent.endDate),
          );
          const title = (deviceEvent.title || '(No title)').slice(0, 200);
          const url = safeUrl(deviceEvent.url) ?? null;
          const notifications = alarmsToReminders(deviceEvent.alarms, startAt);

          const existingId = await findExistingLocalId(
            occurrenceKey,
            deviceEvent.id,
            startAt,
          );

          if (existingId) {
            const local = await EventRepository.getById(existingId);
            if (!local) continue;
            const deviceMod = deviceEvent.lastModifiedDate
              ? new Date(deviceEvent.lastModifiedDate).getTime()
              : 0;
            const localMod = new Date(local.updatedAt).getTime();
            // Device-origin rows always follow the OS. App-origin uses LWW.
            if (deviceMod >= localMod || local.origin === 'device') {
              await EventRepository.update(local.id, {
                title,
                startAt,
                endAt,
                allDay: !!deviceEvent.allDay,
                description: deviceEvent.notes ?? null,
                location: deviceEvent.location ?? null,
                url,
                notifications,
                syncStatus: 'synced',
                deviceEventId: deviceEvent.id,
              });
            }
            await upsertSyncMap(
              local.id,
              occurrenceKey,
              mappedCal.deviceCalendarId!,
            );
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
              url,
              origin: 'device',
              notifications,
            });
            await EventRepository.update(created.id, {
              syncStatus: 'synced',
              deviceEventId: deviceEvent.id,
            });
            await upsertSyncMap(
              created.id,
              occurrenceKey,
              mappedCal.deviceCalendarId!,
            );
          }
        } catch (error) {
          console.warn('[SyncEngine] skipped device event', deviceEvent.id, error);
        }
      }

      // Soft-delete (purge) local mirrors of device events that left the window.
      // Skip calendars with incomplete fetches so a native error cannot wipe the mirror.
      if (completeCalendarIds.size > 0) {
        const calIds = [...completeCalendarIds];
        const placeholders = calIds.map(() => '?').join(',');
        const mirrored = await db.getAllAsync<{
          id: string;
          occurrence_key: string;
        }>(
          `SELECT e.id as id, sm.device_event_id as occurrence_key
           FROM events e
           INNER JOIN sync_map sm ON sm.local_event_id = e.id
           WHERE e.origin = 'device'
             AND e.deleted_at IS NULL
             AND e.calendar_id IN (${placeholders})
             AND e.start_at < ? AND e.end_at > ?`,
          ...calIds,
          range.end,
          range.start,
        );
        let removed = 0;
        for (const row of mirrored) {
          if (seenKeys.has(row.occurrence_key)) continue;
          await EventRepository.purgeDeleted(row.id);
          removed += 1;
        }
        if (removed > 0) {
          console.warn(`[SyncEngine] purged ${removed} disappeared device events`);
        }
      }

      // Schedule local notifications for the rolling window after the mirror is updated.
      await NotificationService.resyncWindow();
    } catch (error) {
      console.warn('[SyncEngine] pull failed', error);
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
