import { describe, expect, it } from 'vitest';

import { expandOccurrences } from './recurrence';
import { isValidOptionalUrl, safeUrl } from './url';
import type { CalendarEvent } from './types';

const baseEvent: CalendarEvent = {
  id: '1',
  calendarId: 'c1',
  title: 'Standup',
  allDay: false,
  startAt: '2026-09-14T09:00:00.000Z',
  endAt: '2026-09-14T09:30:00.000Z',
  recurrence: 'daily',
  description: null,
  location: null,
  url: null,
  notifications: [],
  origin: 'app',
  deviceEventId: null,
  syncStatus: 'synced',
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  deletedAt: null,
};

describe('safeUrl', () => {
  it('allows http https mailto', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com');
    expect(safeUrl('mailto:a@b.c')).toBe('mailto:a@b.c');
  });

  it('rejects javascript', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(isValidOptionalUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('expandOccurrences', () => {
  it('expands daily events across a range', () => {
    const occ = expandOccurrences(
      [baseEvent],
      '2026-09-14T00:00:00.000Z',
      '2026-09-17T00:00:00.000Z',
    );
    expect(occ.length).toBeGreaterThanOrEqual(3);
  });
});
