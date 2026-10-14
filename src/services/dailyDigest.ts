import { format, parseISO, set } from 'date-fns';

export const DAILY_DIGEST_ENABLED_KEY = 'dailyDigestEnabled';
export const DAILY_DIGEST_TIME_KEY = 'dailyDigestTime';
export const DEFAULT_DAILY_DIGEST_TIME = '08:30';
export const DAILY_DIGEST_WINDOW_DAYS = 14;
export const DAILY_DIGEST_ID_PREFIX = 'digest:';

export const TOMORROW_DIGEST_ENABLED_KEY = 'tomorrowDigestEnabled';
export const TOMORROW_DIGEST_TIME_KEY = 'tomorrowDigestTime';
export const DEFAULT_TOMORROW_DIGEST_TIME = '19:00';
export const TOMORROW_DIGEST_ID_PREFIX = 'tomorrowDigest:';

export const MAX_DIGEST_BODY_LENGTH = 240;

export type DigestLineInput = {
  title: string;
  allDay: boolean;
  occurrenceStart: string;
};

export type DigestBodyLabels = {
  allDay: string;
  empty: string;
  more: (count: number) => string;
};

export type DigestTimeParts = {
  hours: number;
  minutes: number;
};

const DEFAULT_DAILY_FALLBACK: DigestTimeParts = { hours: 8, minutes: 30 };
const DEFAULT_TOMORROW_FALLBACK: DigestTimeParts = { hours: 19, minutes: 0 };

export function isDigestSettingEnabled(raw: string | null): boolean {
  if (raw == null) return true;
  return raw !== 'false';
}

export function isDailyDigestEnabled(raw: string | null): boolean {
  return isDigestSettingEnabled(raw);
}

export function isTomorrowDigestEnabled(raw: string | null): boolean {
  return isDigestSettingEnabled(raw);
}

export function parseDigestTime(
  raw: string | null,
  fallback: DigestTimeParts = DEFAULT_DAILY_FALLBACK,
): DigestTimeParts {
  if (!raw) return fallback;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback;
  }
  return { hours, minutes };
}

export function parseTomorrowDigestTime(raw: string | null): DigestTimeParts {
  return parseDigestTime(raw, DEFAULT_TOMORROW_FALLBACK);
}

export function formatDigestTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function digestNotificationId(dayKey: string): string {
  return `${DAILY_DIGEST_ID_PREFIX}${dayKey}`;
}

export function tomorrowDigestNotificationId(dayKey: string): string {
  return `${TOMORROW_DIGEST_ID_PREFIX}${dayKey}`;
}

export function fireAtForDay(
  day: Date,
  hours: number,
  minutes: number,
): Date {
  return set(day, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

export function formatDigestBody(
  events: DigestLineInput[],
  labels: DigestBodyLabels,
  maxLength = MAX_DIGEST_BODY_LENGTH,
): string {
  if (events.length === 0) return labels.empty;

  const lines = events.map((event) => {
    if (event.allDay) {
      return `${labels.allDay} ${event.title}`.trim();
    }
    const time = format(parseISO(event.occurrenceStart), 'HH:mm');
    return `${time} ${event.title}`.trim();
  });

  let body = '';
  let included = 0;
  for (const line of lines) {
    const next = body.length === 0 ? line : `${body}\n${line}`;
    const remaining = events.length - included - 1;
    const moreSuffix =
      remaining > 0 ? `\n${labels.more(remaining)}` : '';
    if (next.length + moreSuffix.length > maxLength) {
      if (included === 0) {
        const truncated = line.slice(0, Math.max(0, maxLength - 1));
        return truncated.length < line.length ? `${truncated}…` : truncated;
      }
      return `${body}\n${labels.more(events.length - included)}`;
    }
    body = next;
    included += 1;
  }
  return body;
}
