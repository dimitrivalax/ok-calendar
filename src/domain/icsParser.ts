import { addDays, addHours, endOfDay } from 'date-fns';
import ICAL from 'ical.js';

import type {
  CalendarEvent,
  EventReminder,
  Recurrence,
} from './types';
import { safeUrl } from './url';

const MAX_TITLE_LENGTH = 200;

export type IcsEventDraft = Partial<CalendarEvent>;

export type IcsParseErrorCode =
  | 'invalid_ics'
  | 'no_events'
  | 'missing_start';

export type IcsParseResult =
  | {
      ok: true;
      draft: IcsEventDraft;
      totalEvents: number;
      unsupportedRecurrence: boolean;
    }
  | {
      ok: false;
      error: IcsParseErrorCode;
    };

function registerTimezones(root: ICAL.Component): Set<string> {
  const registered = new Set<string>();
  const vtimezones = root.getAllSubcomponents('vtimezone');
  for (const vtz of vtimezones) {
    const tzid = vtz.getFirstPropertyValue('tzid');
    if (typeof tzid !== 'string' || !tzid.trim()) continue;
    try {
      const tz = new ICAL.Timezone(vtz);
      ICAL.TimezoneService.register(tz);
      registered.add(tzid);
    } catch {
      // Ignore malformed VTIMEZONE blocks and fall back to IANA/local resolution.
    }
  }
  return registered;
}

/**
 * Convert a wall-clock date/time in an IANA timezone (e.g. "Europe/Paris")
 * to an exact UTC JS Date, without relying on an embedded VTIMEZONE block.
 */
function zonedWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const targetUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

    const getOffsetMs = (candidateMs: number): number => {
      const parts = formatter.formatToParts(new Date(candidateMs));
      const get = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value ?? 0);
      const renderedMs = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour'),
        get('minute'),
        get('second'),
      );
      return renderedMs - candidateMs;
    };

    // Two passes handle DST transition boundaries accurately.
    const firstOffset = getOffsetMs(targetUtcMs);
    let resolvedMs = targetUtcMs - firstOffset;
    const secondOffset = getOffsetMs(resolvedMs);
    if (secondOffset !== firstOffset) {
      resolvedMs = targetUtcMs - secondOffset;
    }

    const result = new Date(resolvedMs);
    return Number.isNaN(result.getTime()) ? null : result;
  } catch {
    return null;
  }
}

function icalTimeToDate(
  time: ICAL.Time,
  tzidParam: string | null,
  registeredTzids: Set<string>,
): Date {
  if (time.isDate) {
    return new Date(time.year, time.month - 1, time.day, 0, 0, 0, 0);
  }

  // If the property explicitly specifies a TZID that was NOT supplied as a VTIMEZONE,
  // resolve it as an IANA timezone so events created in another timezone keep the exact instant.
  if (
    tzidParam &&
    tzidParam.toUpperCase() !== 'UTC' &&
    !registeredTzids.has(tzidParam)
  ) {
    const resolved = zonedWallTimeToDate(
      time.year,
      time.month,
      time.day,
      time.hour,
      time.minute,
      time.second,
      tzidParam,
    );
    if (resolved) return resolved;
  }

  return time.toJSDate();
}

function getTzidParameter(
  component: ICAL.Component,
  propName: string,
): string | null {
  const prop = component.getFirstProperty(propName);
  if (!prop) return null;
  const tzid = prop.getParameter('tzid');
  return typeof tzid === 'string' && tzid.trim() ? tzid.trim() : null;
}

function parseRecurrence(vevent: ICAL.Component): {
  recurrence: Recurrence;
  unsupported: boolean;
} {
  const rrule = vevent.getFirstPropertyValue('rrule') as ICAL.Recur | null;
  if (!rrule || typeof rrule !== 'object') {
    return { recurrence: 'none', unsupported: false };
  }

  const freqMap: Partial<Record<string, Recurrence>> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  };

  const mapped = rrule.freq ? freqMap[rrule.freq.toUpperCase()] : undefined;
  if (!mapped) {
    return { recurrence: 'none', unsupported: true };
  }

  const hasExtraConstraints =
    (typeof rrule.interval === 'number' && rrule.interval > 1) ||
    rrule.count != null ||
    rrule.until != null ||
    (rrule.parts != null && Object.keys(rrule.parts).length > 0);

  return { recurrence: mapped, unsupported: hasExtraConstraints };
}

function offsetMinutesToReminder(offsetMinutes: number): EventReminder | null {
  if (offsetMinutes > 0 || Number.isNaN(offsetMinutes)) return null;

  const before = Math.round(-offsetMinutes);
  if (before === 0) {
    // EventForm currently exposes minutes/hours/days before; 0 minutes before maps cleanly.
    return { id: '', type: 'minutes_before', value: 0 };
  }

  const dayMinutes = 60 * 24;
  if (before % dayMinutes === 0) {
    return { id: '', type: 'days_before', value: before / dayMinutes };
  }
  if (before % 60 === 0) {
    return { id: '', type: 'hours_before', value: before / 60 };
  }
  return { id: '', type: 'minutes_before', value: before };
}

function parseReminders(
  vevent: ICAL.Component,
  startDate: Date,
  endDate: Date,
): EventReminder[] {
  const alarms = vevent.getAllSubcomponents('valarm');
  const reminders: EventReminder[] = [];
  const seen = new Set<string>();

  for (const alarm of alarms) {
    const triggerProp = alarm.getFirstProperty('trigger');
    if (!triggerProp) continue;

    const triggerVal = triggerProp.getFirstValue();
    let offsetMinutes: number | null = null;

    if (triggerVal instanceof ICAL.Duration) {
      const triggerSeconds = triggerVal.toSeconds();
      const related = triggerProp.getParameter('related');
      if (typeof related === 'string' && related.toUpperCase() === 'END') {
        const triggerMs = endDate.getTime() + triggerSeconds * 1000;
        offsetMinutes = (triggerMs - startDate.getTime()) / 60_000;
      } else {
        offsetMinutes = triggerSeconds / 60;
      }
    } else if (triggerVal instanceof ICAL.Time) {
      const alarmDate = triggerVal.toJSDate();
      offsetMinutes = (alarmDate.getTime() - startDate.getTime()) / 60_000;
    }

    if (offsetMinutes == null) continue;
    const reminder = offsetMinutesToReminder(offsetMinutes);
    if (!reminder) continue;

    const key = `${reminder.type}:${reminder.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reminders.push(reminder);
  }

  return reminders;
}

/**
 * Parse an iCalendar (.ics) string and return a pre-filled draft for the first VEVENT.
 */
export function parseFirstIcsEvent(icsContent: string): IcsParseResult {
  const trimmed = icsContent.trim();
  if (!trimmed || !trimmed.includes('BEGIN:VCALENDAR')) {
    return { ok: false, error: 'invalid_ics' };
  }

  let root: ICAL.Component;
  try {
    const jcal = ICAL.parse(trimmed);
    root = new ICAL.Component(jcal);
  } catch {
    return { ok: false, error: 'invalid_ics' };
  }

  const registeredTzids = registerTimezones(root);
  const vevents = root.getAllSubcomponents('vevent');
  if (vevents.length === 0) {
    return { ok: false, error: 'no_events' };
  }

  const vevent = vevents[0];
  const event = new ICAL.Event(vevent);

  if (!event.startDate) {
    return { ok: false, error: 'missing_start' };
  }

  const allDay = event.startDate.isDate;
  const startTzid = getTzidParameter(vevent, 'dtstart');
  const startDate = icalTimeToDate(event.startDate, startTzid, registeredTzids);

  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: 'missing_start' };
  }

  let endDate: Date;
  const hasExplicitEnd =
    vevent.hasProperty('dtend') || vevent.hasProperty('duration');

  if (hasExplicitEnd && event.endDate) {
    const endTzid = getTzidParameter(vevent, 'dtend') ?? startTzid;
    const rawEnd = icalTimeToDate(event.endDate, endTzid, registeredTzids);
    if (allDay) {
      // RFC 5545 DTEND for VALUE=DATE is exclusive (e.g. 20261120..20261121 = 1 day on Nov 20).
      const inclusiveLastDay =
        rawEnd > startDate ? addDays(rawEnd, -1) : startDate;
      endDate = endOfDay(inclusiveLastDay);
    } else {
      endDate = rawEnd > startDate ? rawEnd : addHours(startDate, 1);
    }
  } else {
    endDate = allDay ? endOfDay(startDate) : addHours(startDate, 1);
  }

  const rawTitle = typeof event.summary === 'string' ? event.summary.trim() : '';
  const title = rawTitle.slice(0, MAX_TITLE_LENGTH);
  const description =
    typeof event.description === 'string' && event.description.trim()
      ? event.description.trim()
      : null;
  const location =
    typeof event.location === 'string' && event.location.trim()
      ? event.location.trim()
      : null;

  const rawUrl = vevent.getFirstPropertyValue('url');
  const url =
    typeof rawUrl === 'string' ? (safeUrl(rawUrl) ?? null) : null;

  const { recurrence, unsupported: unsupportedRecurrence } =
    parseRecurrence(vevent);
  const notifications = parseReminders(vevent, startDate, endDate);

  const draft: IcsEventDraft = {
    title,
    allDay,
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    recurrence,
    description,
    location,
    url,
    ...(notifications.length > 0 ? { notifications } : {}),
  };

  return {
    ok: true,
    draft,
    totalEvents: vevents.length,
    unsupportedRecurrence,
  };
}
