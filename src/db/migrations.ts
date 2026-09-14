export const MIGRATION_001 = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY NOT NULL,
  device_calendar_id TEXT,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('local', 'device')),
  allows_modifications INTEGER NOT NULL DEFAULT 1,
  is_visible INTEGER NOT NULL DEFAULT 1,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sync_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  calendar_id TEXT NOT NULL REFERENCES calendars(id),
  title TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  description TEXT,
  location TEXT,
  url TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('app', 'device')),
  device_event_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('synced', 'pending', 'error')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS event_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('at_event', 'minutes_before', 'hours_before', 'days_before')),
  value INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_map (
  local_event_id TEXT PRIMARY KEY NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  device_event_id TEXT NOT NULL,
  device_calendar_id TEXT NOT NULL,
  last_synced_at TEXT,
  last_local_hash TEXT,
  last_device_mod_date TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_range ON events(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_events_calendar ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_sync_device ON sync_map(device_event_id);
`;
