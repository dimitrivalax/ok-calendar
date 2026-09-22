import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isAfter,
  isEqual,
  max,
  min,
  parseISO,
} from 'date-fns';

import type { CalendarEvent, EventOccurrence, Recurrence } from './types';

function advance(date: Date, recurrence: Recurrence): Date {
  switch (recurrence) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    default:
      return date;
  }
}

/** Expand recurring events into concrete occurrences overlapping [rangeStart, rangeEnd]. */
export function expandOccurrences(
  events: CalendarEvent[],
  rangeStartIso: string,
  rangeEndIso: string,
): EventOccurrence[] {
  const rangeStart = parseISO(rangeStartIso);
  const rangeEnd = parseISO(rangeEndIso);
  const results: EventOccurrence[] = [];

  for (const event of events) {
    if (event.deletedAt) continue;

    const start = parseISO(event.startAt);
    const end = parseISO(event.endAt);
    const durationMs = end.getTime() - start.getTime();

    if (event.recurrence === 'none') {
      if (end > rangeStart && start < rangeEnd) {
        results.push({
          ...event,
          occurrenceStart: event.startAt,
          occurrenceEnd: event.endAt,
        });
      }
      continue;
    }

    let cursor = start;
    // Cap expansions to avoid infinite loops
    let guard = 0;
    while (cursor < rangeEnd && guard < 500) {
      const occEnd = new Date(cursor.getTime() + durationMs);
      if (occEnd > rangeStart && cursor < rangeEnd) {
        results.push({
          ...event,
          occurrenceStart: cursor.toISOString(),
          occurrenceEnd: occEnd.toISOString(),
        });
      }
      cursor = advance(cursor, event.recurrence);
      guard += 1;
      if (isEqual(cursor, start)) break;
    }
  }

  return results.sort((a, b) =>
    a.occurrenceStart.localeCompare(b.occurrenceStart),
  );
}

export function clampRange(start: Date, end: Date): { start: Date; end: Date } {
  return { start: min([start, end]), end: max([start, end]) };
}

export function isValidEventRange(startAt: string, endAt: string): boolean {
  try {
    // Allow zero-duration events (common on device calendars).
    return !isAfter(parseISO(startAt), parseISO(endAt));
  } catch {
    return false;
  }
}
