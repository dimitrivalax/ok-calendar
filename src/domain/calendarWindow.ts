import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { ViewMode } from '@/domain/types';

export const WEEK_OPTIONS = { weekStartsOn: 1 as const };

/** Inclusive agenda window length in days from cursor (start -> start + N). */
export const AGENDA_RANGE_DAYS = 60;

export function rangeForView(
  mode: ViewMode,
  cursor: Date,
): { start: string; end: string } {
  if (mode === 'day') {
    return {
      start: startOfDay(cursor).toISOString(),
      end: endOfDay(cursor).toISOString(),
    };
  }
  if (mode === 'week') {
    return {
      start: startOfWeek(cursor, WEEK_OPTIONS).toISOString(),
      end: endOfWeek(cursor, WEEK_OPTIONS).toISOString(),
    };
  }
  if (mode === 'agenda') {
    return {
      start: startOfDay(cursor).toISOString(),
      end: endOfDay(addDays(cursor, AGENDA_RANGE_DAYS)).toISOString(),
    };
  }
  return {
    start: startOfWeek(startOfMonth(cursor), WEEK_OPTIONS).toISOString(),
    end: endOfWeek(endOfMonth(cursor), WEEK_OPTIONS).toISOString(),
  };
}

/**
 * Unified SQLite fetch window around `cursor` that covers all 4 view modes
 * (month grid, week, day, and 60-day agenda) so switching tabs never needs
 * to reload events from SQLite or the device calendar.
 */
export function windowForCursor(cursor: Date): { start: string; end: string } {
  const monthGridStart = startOfWeek(startOfMonth(cursor), WEEK_OPTIONS);
  const monthGridEnd = endOfWeek(endOfMonth(cursor), WEEK_OPTIONS);
  const agendaEnd = endOfDay(addDays(cursor, AGENDA_RANGE_DAYS));
  return {
    start: monthGridStart.toISOString(),
    end: (monthGridEnd > agendaEnd ? monthGridEnd : agendaEnd).toISOString(),
  };
}

export function shiftDateByView(
  current: Date,
  mode: ViewMode,
  delta: number,
): Date {
  if (mode === 'day') {
    return addDays(current, delta);
  }
  if (mode === 'week' || mode === 'agenda') {
    return addWeeks(current, delta);
  }
  return addMonths(current, delta);
}
