import { addHours, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { nextEndAtFromStartChange } from './eventRange';

describe('nextEndAtFromStartChange', () => {
  describe('when start time changes', () => {
    it('sets end to one hour after start', () => {
      expect(
        nextEndAtFromStartChange(
          '2026-10-14T10:00:00.000Z',
          '2026-10-14T18:00:00.000Z',
          'time',
        ),
      ).toBe('2026-10-14T11:00:00.000Z');
    });

    it('ignores the previous end value', () => {
      expect(
        nextEndAtFromStartChange(
          '2026-10-14T08:15:00.000Z',
          '2026-10-20T23:59:00.000Z',
          'time',
        ),
      ).toBe('2026-10-14T09:15:00.000Z');
    });

    it('crosses midnight when needed', () => {
      expect(
        nextEndAtFromStartChange(
          '2026-10-14T23:30:00.000Z',
          '2026-10-14T12:00:00.000Z',
          'time',
        ),
      ).toBe('2026-10-15T00:30:00.000Z');
    });
  });

  describe('when start date changes', () => {
    it('copies start calendar day onto end and keeps end time-of-day', () => {
      const start = new Date(2026, 9, 20, 9, 0, 0).toISOString();
      const end = new Date(2026, 9, 22, 15, 30, 0).toISOString();
      const result = parseISO(nextEndAtFromStartChange(start, end, 'date'));
      const startDate = parseISO(start);
      const endDate = parseISO(end);

      expect(result.getFullYear()).toBe(startDate.getFullYear());
      expect(result.getMonth()).toBe(startDate.getMonth());
      expect(result.getDate()).toBe(startDate.getDate());
      expect(result.getHours()).toBe(endDate.getHours());
      expect(result.getMinutes()).toBe(endDate.getMinutes());
    });

    it('falls back to start + 1 hour when synced end would not be after start', () => {
      const start = new Date(2026, 9, 14, 16, 0, 0).toISOString();
      // Same time-of-day earlier than start once moved onto start's day
      const end = new Date(2026, 9, 15, 10, 0, 0).toISOString();

      expect(nextEndAtFromStartChange(start, end, 'date')).toBe(
        addHours(parseISO(start), 1).toISOString(),
      );
    });

    it('falls back to start + 1 hour when end time equals start time', () => {
      const start = new Date(2026, 9, 14, 12, 0, 0).toISOString();
      const end = new Date(2026, 9, 20, 12, 0, 0).toISOString();

      expect(nextEndAtFromStartChange(start, end, 'date')).toBe(
        addHours(parseISO(start), 1).toISOString(),
      );
    });
  });
});
