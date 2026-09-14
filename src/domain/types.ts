export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventOrigin = 'app' | 'device';
export type SyncStatus = 'synced' | 'pending' | 'error';
export type ReminderType = 'at_event' | 'minutes_before' | 'hours_before' | 'days_before';
export type ViewMode = 'month' | 'year' | 'day' | 'agenda';
export type CalendarSource = 'local' | 'device';

export type Calendar = {
  id: string;
  deviceCalendarId: string | null;
  title: string;
  color: string;
  source: CalendarSource;
  allowsModifications: boolean;
  isVisible: boolean;
  isPrimary: boolean;
  syncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type EventOccurrence = CalendarEvent & {
  occurrenceStart: string;
  occurrenceEnd: string;
};

export type CreateEventInput = {
  calendarId: string;
  title: string;
  allDay: boolean;
  startAt: string;
  endAt: string;
  recurrence: Recurrence;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  notifications?: Omit<EventReminder, 'id'>[];
  origin?: EventOrigin;
};
