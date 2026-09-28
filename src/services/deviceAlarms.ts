import type { EventReminder, ReminderType } from '@/domain/types';

type DeviceAlarm = {
  relativeOffset?: number;
  absoluteDate?: string;
};

/** Convert expo-calendar alarms into local reminder rows (minutes-based). */
export function alarmsToReminders(
  alarms: DeviceAlarm[] | null | undefined,
  eventStartAt: string,
): Omit<EventReminder, 'id'>[] {
  if (!alarms?.length) return [];

  const startMs = new Date(eventStartAt).getTime();
  const seen = new Set<string>();
  const reminders: Omit<EventReminder, 'id'>[] = [];

  for (const alarm of alarms) {
    const offset = relativeOffsetMinutes(alarm, startMs);
    if (offset == null) continue;
    const reminder = offsetToReminder(offset);
    if (!reminder) continue;
    const key = `${reminder.type}:${reminder.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reminders.push(reminder);
  }

  return reminders;
}

function relativeOffsetMinutes(
  alarm: DeviceAlarm,
  startMs: number,
): number | null {
  if (typeof alarm.relativeOffset === 'number' && !Number.isNaN(alarm.relativeOffset)) {
    return Math.round(alarm.relativeOffset);
  }
  if (alarm.absoluteDate) {
    const absoluteMs = new Date(alarm.absoluteDate).getTime();
    if (Number.isNaN(absoluteMs) || Number.isNaN(startMs)) return null;
    return Math.round((absoluteMs - startMs) / 60_000);
  }
  return null;
}

/**
 * Map a relative offset (minutes from start; negative = before) to a ReminderType.
 * Alarms after the start are unsupported and dropped.
 */
function offsetToReminder(
  offsetMinutes: number,
): Omit<EventReminder, 'id'> | null {
  if (offsetMinutes > 0) return null;
  if (offsetMinutes === 0) return { type: 'at_event' satisfies ReminderType, value: 0 };

  const before = -offsetMinutes;
  const dayMinutes = 60 * 24;
  if (before % dayMinutes === 0) {
    return { type: 'days_before', value: before / dayMinutes };
  }
  if (before % 60 === 0) {
    return { type: 'hours_before', value: before / 60 };
  }
  return { type: 'minutes_before', value: before };
}
