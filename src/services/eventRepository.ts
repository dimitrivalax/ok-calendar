import { createId } from '@/domain/id';
import { isValidEventRange } from '@/domain/recurrence';
import { isValidOptionalUrl, safeUrl } from '@/domain/url';
import type {
  Calendar,
  CalendarEvent,
  CreateEventInput,
  EventReminder,
  ReminderType,
  SyncStatus,
} from '@/domain/types';
import { getDb } from '@/db/client';

type EventRow = {
  id: string;
  calendar_id: string;
  title: string;
  all_day: number;
  start_at: string;
  end_at: string;
  recurrence: CalendarEvent['recurrence'];
  description: string | null;
  location: string | null;
  url: string | null;
  origin: CalendarEvent['origin'];
  device_event_id: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ReminderRow = {
  id: string;
  event_id: string;
  type: ReminderType;
  value: number;
  sort_order: number;
};

type CalendarRow = {
  id: string;
  device_calendar_id: string | null;
  title: string;
  color: string;
  source: Calendar['source'];
  allows_modifications: number;
  is_visible: number;
  is_primary: number;
  sync_enabled: number;
  created_at: string;
  updated_at: string;
};

function mapCalendar(row: CalendarRow): Calendar {
  return {
    id: row.id,
    deviceCalendarId: row.device_calendar_id,
    title: row.title,
    color: row.color,
    source: row.source,
    allowsModifications: !!row.allows_modifications,
    isVisible: !!row.is_visible,
    isPrimary: !!row.is_primary,
    syncEnabled: !!row.sync_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow, reminders: EventReminder[]): CalendarEvent {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    title: row.title,
    allDay: !!row.all_day,
    startAt: row.start_at,
    endAt: row.end_at,
    recurrence: row.recurrence,
    description: row.description,
    location: row.location,
    url: row.url,
    notifications: reminders,
    origin: row.origin,
    deviceEventId: row.device_event_id,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

async function loadReminders(eventId: string): Promise<EventReminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM event_reminders WHERE event_id = ? ORDER BY sort_order ASC`,
    eventId,
  );
  return rows.map((r) => ({ id: r.id, type: r.type, value: r.value }));
}

async function replaceReminders(
  eventId: string,
  reminders: Omit<EventReminder, 'id'>[] | EventReminder[],
) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM event_reminders WHERE event_id = ?`, eventId);
  let order = 0;
  for (const reminder of reminders) {
    await db.runAsync(
      `INSERT INTO event_reminders (id, event_id, type, value, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      'id' in reminder && reminder.id ? reminder.id : createId(),
      eventId,
      reminder.type,
      reminder.value,
      order++,
    );
  }
}

function validateInput(input: {
  title: string;
  startAt: string;
  endAt: string;
  url?: string | null;
}) {
  const title = input.title.trim();
  if (!title || title.length > 200) {
    throw new Error('Invalid title');
  }
  if (!isValidEventRange(input.startAt, input.endAt)) {
    throw new Error('Invalid date range');
  }
  if (!isValidOptionalUrl(input.url)) {
    throw new Error('Invalid URL');
  }
  return title;
}

export const EventRepository = {
  async listCalendars(): Promise<Calendar[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<CalendarRow>(
      `SELECT * FROM calendars ORDER BY is_primary DESC, title ASC`,
    );
    return rows.map(mapCalendar);
  },

  async getPrimaryCalendar(): Promise<Calendar | null> {
    const calendars = await this.listCalendars();
    return calendars.find((c) => c.isPrimary) ?? calendars[0] ?? null;
  },

  async updateCalendarVisibility(id: string, isVisible: boolean) {
    const db = await getDb();
    await db.runAsync(
      `UPDATE calendars SET is_visible = ?, updated_at = ? WHERE id = ?`,
      isVisible ? 1 : 0,
      new Date().toISOString(),
      id,
    );
  },

  async setPrimaryCalendar(id: string) {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE calendars SET is_primary = 0, updated_at = ?`, now);
    await db.runAsync(
      `UPDATE calendars SET is_primary = 1, updated_at = ? WHERE id = ?`,
      now,
      id,
    );
  },

  async create(input: CreateEventInput): Promise<CalendarEvent> {
    const title = validateInput(input);
    const db = await getDb();
    const now = new Date().toISOString();
    const id = createId();
    const url = safeUrl(input.url) ?? null;

    await db.runAsync(
      `INSERT INTO events (
        id, calendar_id, title, all_day, start_at, end_at, recurrence,
        description, location, url, origin, device_event_id, sync_status,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, NULL)`,
      id,
      input.calendarId,
      title,
      input.allDay ? 1 : 0,
      input.startAt,
      input.endAt,
      input.recurrence,
      input.description?.slice(0, 5000) ?? null,
      input.location ?? null,
      url,
      input.origin ?? 'app',
      now,
      now,
    );

    await replaceReminders(id, input.notifications ?? []);
    return (await this.getById(id))!;
  },

  async update(
    id: string,
    patch: Partial<CreateEventInput> & {
      syncStatus?: SyncStatus;
      deviceEventId?: string | null;
    },
  ): Promise<CalendarEvent> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Event not found');

    const next = {
      title: patch.title ?? existing.title,
      allDay: patch.allDay ?? existing.allDay,
      startAt: patch.startAt ?? existing.startAt,
      endAt: patch.endAt ?? existing.endAt,
      recurrence: patch.recurrence ?? existing.recurrence,
      description:
        patch.description !== undefined
          ? patch.description
          : existing.description,
      location:
        patch.location !== undefined ? patch.location : existing.location,
      url: patch.url !== undefined ? patch.url : existing.url,
      calendarId: patch.calendarId ?? existing.calendarId,
    };

    const title = validateInput(next);
    const db = await getDb();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE events SET
        calendar_id = ?, title = ?, all_day = ?, start_at = ?, end_at = ?,
        recurrence = ?, description = ?, location = ?, url = ?,
        sync_status = ?, device_event_id = ?, updated_at = ?
       WHERE id = ?`,
      next.calendarId,
      title,
      next.allDay ? 1 : 0,
      next.startAt,
      next.endAt,
      next.recurrence,
      next.description?.slice(0, 5000) ?? null,
      next.location ?? null,
      safeUrl(next.url) ?? null,
      patch.syncStatus ?? 'pending',
      patch.deviceEventId !== undefined
        ? patch.deviceEventId
        : existing.deviceEventId,
      now,
      id,
    );

    if (patch.notifications) {
      await replaceReminders(id, patch.notifications);
    }

    return (await this.getById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE events SET deleted_at = ?, sync_status = 'pending', updated_at = ? WHERE id = ?`,
      new Date().toISOString(),
      new Date().toISOString(),
      id,
    );
  },

  async purgeDeleted(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM event_reminders WHERE event_id = ?`, id);
    await db.runAsync(`DELETE FROM sync_map WHERE local_event_id = ?`, id);
    await db.runAsync(`DELETE FROM events WHERE id = ?`, id);
  },

  async getById(id: string): Promise<CalendarEvent | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<EventRow>(
      `SELECT * FROM events WHERE id = ?`,
      id,
    );
    if (!row) return null;
    return mapEvent(row, await loadReminders(id));
  },

  async listInRange(
    startIso: string,
    endIso: string,
    calendarIds?: string[],
  ): Promise<CalendarEvent[]> {
    const db = await getDb();
    let sql = `SELECT * FROM events WHERE deleted_at IS NULL
      AND start_at < ? AND end_at > ?`;
    const params: (string | number)[] = [endIso, startIso];

    if (calendarIds && calendarIds.length > 0) {
      sql += ` AND calendar_id IN (${calendarIds.map(() => '?').join(',')})`;
      params.push(...calendarIds);
    }

    sql += ` ORDER BY start_at ASC`;
    const rows = await db.getAllAsync<EventRow>(sql, ...params);
    const events: CalendarEvent[] = [];
    for (const row of rows) {
      events.push(mapEvent(row, await loadReminders(row.id)));
    }

    // Also include recurring series that started before range
    const recurring = await db.getAllAsync<EventRow>(
      `SELECT * FROM events WHERE deleted_at IS NULL AND recurrence != 'none' AND start_at < ?`,
      endIso,
    );
    for (const row of recurring) {
      if (events.some((e) => e.id === row.id)) continue;
      if (calendarIds && !calendarIds.includes(row.calendar_id)) continue;
      events.push(mapEvent(row, await loadReminders(row.id)));
    }

    return events;
  },

  async listPending(): Promise<CalendarEvent[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<EventRow>(
      `SELECT * FROM events WHERE sync_status IN ('pending', 'error')`,
    );
    const events: CalendarEvent[] = [];
    for (const row of rows) {
      events.push(mapEvent(row, await loadReminders(row.id)));
    }
    return events;
  },
};
