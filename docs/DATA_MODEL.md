# Modèle de données

**Objectif.** Définir le schéma SQLite, les types TypeScript et les invariants du domaine Ok-Calendar. Complète [SPECS.md](SPECS.md) §4.

## DDL initial (migration `001_init`)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE calendars (
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

CREATE TABLE events (
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

CREATE TABLE event_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('at_event', 'minutes_before', 'hours_before', 'days_before')),
  value INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sync_map (
  local_event_id TEXT PRIMARY KEY NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  device_event_id TEXT NOT NULL,
  device_calendar_id TEXT NOT NULL,
  last_synced_at TEXT,
  last_local_hash TEXT,
  last_device_mod_date TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX idx_events_range ON events(start_at, end_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_calendar ON events(calendar_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sync_device ON sync_map(device_event_id);
```

## Types TypeScript (contrats)

```ts
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventOrigin = 'app' | 'device';
export type SyncStatus = 'synced' | 'pending' | 'error';
export type ReminderType = 'at_event' | 'minutes_before' | 'hours_before' | 'days_before';
export type ViewMode = 'month' | 'year' | 'day' | 'agenda';

export type Calendar = {
  id: string;
  deviceCalendarId: string | null;
  title: string;
  color: string;
  source: 'local' | 'device';
  allowsModifications: boolean;
  isVisible: boolean;
  isPrimary: boolean;
  syncEnabled: boolean;
};

export type EventReminder = {
  id: string;
  type: ReminderType;
  value: number;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  allDay: boolean;
  startAt: string;
  endAt: string;
  recurrence: Recurrence;
  description: string | null;
  location: string | null;
  url: string | null;
  notifications: EventReminder[];
  origin: EventOrigin;
  deviceEventId: string | null;
  syncStatus: SyncStatus;
  updatedAt: string;
  deletedAt: string | null;
};
```

## Contrats services

```ts
interface EventRepository {
  create(input: Omit<CalendarEvent, 'id' | 'syncStatus' | 'updatedAt' | 'deletedAt' | 'deviceEventId'>): Promise<CalendarEvent>;
  update(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent>;
  delete(id: string): Promise<void>; // soft-delete
  getById(id: string): Promise<CalendarEvent | null>;
  listInRange(startIso: string, endIso: string, calendarIds?: string[]): Promise<CalendarEvent[]>;
}

interface CalendarService {
  requestPermissions(): Promise<'granted' | 'denied'>;
  listDevice(): Promise<Calendar[]>;
  create(input: { title: string; color: string }): Promise<Calendar>;
  update(id: string, patch: Partial<Calendar>): Promise<Calendar>;
  delete(id: string): Promise<void>;
}

interface SyncEngine {
  pull(range: { start: string; end: string }): Promise<void>;
  pushEvent(localEventId: string): Promise<void>;
  pushAllPending(): Promise<void>;
}

interface NotificationService {
  syncForEvent(eventId: string): Promise<void>;
  cancelForEvent(eventId: string): Promise<void>;
  resyncWindow(): Promise<void>;
}
```

## Invariants

- `end_at > start_at` (all-day : fin exclusive jour suivant acceptée)
- `url` vide ou schéma `http` / `https` / `mailto`
- Événement `origin=app` : SQLite SoT ; push device best-effort
- Soft-delete : `deleted_at` non null → exclu des listes UI ; purge après sync OK
- `settings.locale` ∈ `{en,fr}` ; défaut applicatif `en`
