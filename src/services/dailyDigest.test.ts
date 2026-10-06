import { describe, expect, it } from 'vitest';

import {
  formatDigestBody,
  formatDigestTime,
  isDailyDigestEnabled,
  parseDigestTime,
} from './dailyDigest';

const labels = {
  allDay: 'All day',
  empty: 'You have free time today — go outside!',
  more: (count: number) => `+${count} more`,
};

describe('parseDigestTime', () => {
  it('defaults to 08:30', () => {
    expect(parseDigestTime(null)).toEqual({ hours: 8, minutes: 30 });
    expect(parseDigestTime('')).toEqual({ hours: 8, minutes: 30 });
    expect(parseDigestTime('nope')).toEqual({ hours: 8, minutes: 30 });
    expect(parseDigestTime('25:00')).toEqual({ hours: 8, minutes: 30 });
  });

  it('parses valid HH:mm', () => {
    expect(parseDigestTime('08:30')).toEqual({ hours: 8, minutes: 30 });
    expect(parseDigestTime('9:05')).toEqual({ hours: 9, minutes: 5 });
    expect(parseDigestTime('23:59')).toEqual({ hours: 23, minutes: 59 });
  });
});

describe('formatDigestTime', () => {
  it('zero-pads hours and minutes', () => {
    expect(formatDigestTime(8, 30)).toBe('08:30');
    expect(formatDigestTime(9, 5)).toBe('09:05');
  });
});

describe('isDailyDigestEnabled', () => {
  it('defaults to enabled', () => {
    expect(isDailyDigestEnabled(null)).toBe(true);
    expect(isDailyDigestEnabled('true')).toBe(true);
    expect(isDailyDigestEnabled('false')).toBe(false);
  });
});

describe('formatDigestBody', () => {
  it('returns the empty fun message when there are no events', () => {
    expect(formatDigestBody([], labels)).toBe(labels.empty);
  });

  it('lists timed and all-day events', () => {
    expect(
      formatDigestBody(
        [
          {
            title: 'Standup',
            allDay: false,
            occurrenceStart: '2026-10-06T09:00:00.000Z',
          },
          {
            title: 'Offsite',
            allDay: true,
            occurrenceStart: '2026-10-06T00:00:00.000Z',
          },
        ],
        labels,
      ),
    ).toMatch(/^\d{2}:\d{2} Standup\nAll day Offsite$/);
  });

  it('truncates with a +N more suffix', () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      title: `Event number ${i + 1} with a long title`,
      allDay: false,
      occurrenceStart: `2026-10-06T${String(8 + (i % 10)).padStart(2, '0')}:00:00.000Z`,
    }));
    const body = formatDigestBody(events, labels, 80);
    expect(body.length).toBeLessThanOrEqual(80);
    expect(body).toMatch(/\+\d+ more$/);
  });
});
