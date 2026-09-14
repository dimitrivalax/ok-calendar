import { Platform } from 'react-native';

import { createId } from '@/domain/id';
import { MIGRATION_001 } from './migrations';
import { openWebDatabase, type WebDatabase } from './webDatabase';

type AppDatabase = WebDatabase | Awaited<
  ReturnType<typeof import('expo-sqlite').openDatabaseAsync>
>;

let dbPromise: Promise<AppDatabase> | null = null;

export async function getDb(): Promise<AppDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      if (Platform.OS === 'web') {
        const db = await openWebDatabase();
        await ensureDefaultCalendar(db);
        return db;
      }

      const SQLite = await import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync('ok-calendar.db');
      await db.execAsync(MIGRATION_001);
      await ensureDefaultCalendar(db);
      return db;
    })();
  }
  return dbPromise;
}

async function ensureDefaultCalendar(db: AppDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM calendars WHERE source = 'local'`,
  );
  if ((row?.count ?? 0) > 0) return;

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO calendars (
      id, device_calendar_id, title, color, source,
      allows_modifications, is_visible, is_primary, sync_enabled,
      created_at, updated_at
    ) VALUES (?, NULL, ?, ?, 'local', 1, 1, 1, 1, ?, ?)`,
    createId(),
    'OK Calendar',
    '#208AEF',
    now,
    now,
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}
