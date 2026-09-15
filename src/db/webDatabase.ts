import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Minimal SQLite-shaped store for Expo web.
 * expo-sqlite's wa-sqlite worker is unreliable with NativeWind Metro;
 * native keeps real expo-sqlite.
 */

type Row = Record<string, unknown>;

type Tables = {
  calendars: Row[];
  events: Row[];
  event_reminders: Row[];
  sync_map: Row[];
  settings: Row[];
};

const STORAGE_KEY = 'ok-calendar.web.db.v1';

const emptyTables = (): Tables => ({
  calendars: [],
  events: [],
  event_reminders: [],
  sync_map: [],
  settings: [],
});

function bind(sql: string, params: unknown[]): { text: string; values: unknown[] } {
  // expo-sqlite style: `?` placeholders in order
  return { text: sql.replace(/\s+/g, ' ').trim(), values: params };
}

export type WebDatabase = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...params: unknown[]) => Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
};

export async function openWebDatabase(): Promise<WebDatabase> {
  let tables = emptyTables();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) tables = { ...emptyTables(), ...JSON.parse(raw) };
  } catch {
    tables = emptyTables();
  }

  const persist = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  };

  const db: WebDatabase = {
    async execAsync() {
      // migrations are no-ops — tables exist in memory
    },

    async runAsync(sql: string, ...params: unknown[]) {
      const { text, values } = bind(sql, params);

      if (/^DELETE FROM event_reminders WHERE event_id = \?$/i.test(text)) {
        tables.event_reminders = tables.event_reminders.filter(
          (r) => r.event_id !== values[0],
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^DELETE FROM sync_map WHERE local_event_id = \?$/i.test(text)) {
        tables.sync_map = tables.sync_map.filter(
          (r) => r.local_event_id !== values[0],
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^DELETE FROM events WHERE id = \?$/i.test(text)) {
        tables.events = tables.events.filter((r) => r.id !== values[0]);
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^INSERT INTO calendars/i.test(text)) {
        const row = {
          id: values[0],
          device_calendar_id: values[1],
          title: values[2],
          color: values[3],
          source: values[4] ?? 'local',
          allows_modifications: values[5] ?? 1,
          is_visible: values[6] ?? 1,
          is_primary: values[7] ?? 0,
          sync_enabled: values[8] ?? 1,
          created_at: values[9],
          updated_at: values[10],
        };
        // Handle two insert shapes from client / calendarDevice
        if (text.includes("'local'")) {
          Object.assign(row, {
            id: values[0],
            device_calendar_id: null,
            title: values[1],
            color: values[2],
            source: 'local',
            allows_modifications: 1,
            is_visible: 1,
            is_primary: 1,
            sync_enabled: 1,
            created_at: values[3],
            updated_at: values[4],
          });
        } else if (text.includes("'device'")) {
          Object.assign(row, {
            id: values[0],
            device_calendar_id: values[1],
            title: values[2],
            color: values[3],
            source: 'device',
            allows_modifications: values[4],
            is_visible: 1,
            is_primary: values[5],
            sync_enabled: 1,
            created_at: values[6],
            updated_at: values[7],
          });
        }
        tables.calendars.push(row);
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^INSERT INTO events/i.test(text)) {
        tables.events.push({
          id: values[0],
          calendar_id: values[1],
          title: values[2],
          all_day: values[3],
          start_at: values[4],
          end_at: values[5],
          recurrence: values[6],
          description: values[7],
          location: values[8],
          url: values[9],
          origin: values[10],
          device_event_id: null,
          sync_status: 'pending',
          created_at: values[11],
          updated_at: values[12],
          deleted_at: null,
        });
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^INSERT INTO event_reminders/i.test(text)) {
        tables.event_reminders.push({
          id: values[0],
          event_id: values[1],
          type: values[2],
          value: values[3],
          sort_order: values[4],
        });
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^INSERT INTO settings/i.test(text) || /ON CONFLICT\(key\)/i.test(text)) {
        const key = values[0] as string;
        const value = values[1];
        const idx = tables.settings.findIndex((s) => s.key === key);
        if (idx >= 0) tables.settings[idx] = { key, value };
        else tables.settings.push({ key, value });
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^INSERT OR REPLACE INTO sync_map/i.test(text)) {
        const row = {
          local_event_id: values[0],
          device_event_id: values[1],
          device_calendar_id: values[2],
          last_synced_at: values[3],
          last_local_hash: null,
          last_device_mod_date: null,
        };
        tables.sync_map = tables.sync_map.filter(
          (r) => r.local_event_id !== values[0],
        );
        tables.sync_map.push(row);
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^UPDATE calendars SET is_visible/i.test(text)) {
        const [isVisible, updatedAt, id] = values;
        tables.calendars = tables.calendars.map((c) =>
          c.id === id
            ? { ...c, is_visible: isVisible, updated_at: updatedAt }
            : c,
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^UPDATE calendars SET is_primary = 0/i.test(text)) {
        const [updatedAt] = values;
        tables.calendars = tables.calendars.map((c) => ({
          ...c,
          is_primary: 0,
          updated_at: updatedAt,
        }));
        await persist();
        return { changes: tables.calendars.length, lastInsertRowId: 0 };
      }

      if (/^UPDATE calendars SET is_primary = 1/i.test(text)) {
        const [updatedAt, id] = values;
        tables.calendars = tables.calendars.map((c) =>
          c.id === id
            ? { ...c, is_primary: 1, updated_at: updatedAt }
            : c,
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^UPDATE calendars SET title/i.test(text)) {
        const [title, color, allows, updatedAt, id] = values;
        tables.calendars = tables.calendars.map((c) =>
          c.id === id
            ? {
                ...c,
                title,
                color,
                allows_modifications: allows,
                updated_at: updatedAt,
              }
            : c,
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^UPDATE events SET[\s\S]*calendar_id/i.test(text)) {
        const [
          calendarId,
          title,
          allDay,
          startAt,
          endAt,
          recurrence,
          description,
          location,
          url,
          syncStatus,
          deviceEventId,
          updatedAt,
          id,
        ] = values;
        tables.events = tables.events.map((e) =>
          e.id === id
            ? {
                ...e,
                calendar_id: calendarId,
                title,
                all_day: allDay,
                start_at: startAt,
                end_at: endAt,
                recurrence,
                description,
                location,
                url,
                sync_status: syncStatus,
                device_event_id: deviceEventId,
                updated_at: updatedAt,
              }
            : e,
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      if (/^UPDATE events SET deleted_at/i.test(text)) {
        const [deletedAt, updatedAt, id] = values;
        tables.events = tables.events.map((e) =>
          e.id === id
            ? {
                ...e,
                deleted_at: deletedAt,
                sync_status: 'pending',
                updated_at: updatedAt,
              }
            : e,
        );
        await persist();
        return { changes: 1, lastInsertRowId: 0 };
      }

      console.warn('[web-db] unhandled runAsync', text);
      return { changes: 0, lastInsertRowId: 0 };
    },

    async getFirstAsync<T>(sql: string, ...params: unknown[]) {
      const rows = await db.getAllAsync<T>(sql, ...params);
      return rows[0] ?? null;
    },

    async getAllAsync<T>(sql: string, ...params: unknown[]) {
      const { text, values } = bind(sql, params);

      if (/SELECT COUNT\(\*\) as count FROM calendars WHERE source = 'local'/i.test(text)) {
        return [
          {
            count: tables.calendars.filter((c) => c.source === 'local').length,
          },
        ] as T[];
      }

      if (/SELECT value FROM settings WHERE key = \?/i.test(text)) {
        const row = tables.settings.find((s) => s.key === values[0]);
        return (row ? [{ value: row.value }] : []) as T[];
      }

      if (/SELECT \* FROM calendars/i.test(text)) {
        return [...tables.calendars].sort((a, b) => {
          const ap = Number(b.is_primary) - Number(a.is_primary);
          if (ap !== 0) return ap;
          return String(a.title).localeCompare(String(b.title));
        }) as T[];
      }

      if (/SELECT id FROM calendars WHERE device_calendar_id = \?/i.test(text)) {
        const row = tables.calendars.find(
          (c) => c.device_calendar_id === values[0],
        );
        return (row ? [{ id: row.id }] : []) as T[];
      }

      if (
        /SELECT \* FROM event_reminders WHERE event_id = \?/i.test(text)
      ) {
        return tables.event_reminders
          .filter((r) => r.event_id === values[0])
          .sort(
            (a, b) => Number(a.sort_order) - Number(b.sort_order),
          ) as T[];
      }

      if (/SELECT \* FROM events WHERE id = \?/i.test(text)) {
        const row = tables.events.find((e) => e.id === values[0]);
        return (row ? [row] : []) as T[];
      }

      if (
        /SELECT local_event_id as id FROM sync_map WHERE device_event_id = \?/i.test(
          text,
        )
      ) {
        const row = tables.sync_map.find(
          (s) => s.device_event_id === values[0],
        );
        return (row ? [{ id: row.local_event_id }] : []) as T[];
      }

      if (
        /SELECT \* FROM events WHERE sync_status IN \('pending', 'error'\)/i.test(
          text,
        )
      ) {
        return tables.events.filter(
          (e) => e.sync_status === 'pending' || e.sync_status === 'error',
        ) as T[];
      }

      if (
        /SELECT \* FROM events WHERE deleted_at IS NULL AND recurrence != 'none' AND start_at < \?/i.test(
          text,
        )
      ) {
        return tables.events.filter(
          (e) =>
            e.deleted_at == null &&
            e.recurrence !== 'none' &&
            String(e.start_at) < String(values[0]),
        ) as T[];
      }

      if (/SELECT \* FROM events WHERE deleted_at IS NULL/i.test(text)) {
        const endIso = values[0] as string;
        const startIso = values[1] as string;
        let rows = tables.events.filter(
          (e) =>
            e.deleted_at == null &&
            String(e.start_at) < endIso &&
            String(e.end_at) > startIso,
        );
        if (text.includes('calendar_id IN')) {
          const ids = values.slice(2) as string[];
          rows = rows.filter((e) => ids.includes(String(e.calendar_id)));
        }
        rows.sort((a, b) =>
          String(a.start_at).localeCompare(String(b.start_at)),
        );
        return rows as T[];
      }

      console.warn('[web-db] unhandled getAllAsync', text);
      return [] as T[];
    },
  };

  return db;
}
