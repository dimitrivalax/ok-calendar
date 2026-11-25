import { describe, expect, it } from 'vitest';

import {
  AGENDA_RANGE_DAYS,
  rangeForView,
  shiftDateByView,
  windowForCursor,
} from './calendarWindow';

describe('calendarWindow', () => {
  const cursor = new Date(2026, 9, 14, 15, 30, 0); // Wed 14 Oct 2026

  describe('rangeForView', () => {
    it('covers the full day for day mode', () => {
      const { start, end } = rangeForView('day', cursor);
      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(9);
      expect(startDate.getDate()).toBe(14);
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getDate()).toBe(14);
      expect(endDate.getHours()).toBe(23);
    });

    it('starts on Monday and ends on Sunday for week mode', () => {
      const { start, end } = rangeForView('week', cursor);
      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getDay()).toBe(1); // Monday 12 Oct
      expect(startDate.getDate()).toBe(12);
      expect(endDate.getDay()).toBe(0); // Sunday 18 Oct
      expect(endDate.getDate()).toBe(18);
    });

    it('covers AGENDA_RANGE_DAYS inclusive for agenda mode', () => {
      const { start, end } = rangeForView('agenda', cursor);
      const diffDays = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) /
          (24 * 60 * 60 * 1000),
      );

      expect(diffDays).toBe(AGENDA_RANGE_DAYS + 1);
    });

    it('covers full Monday-to-Sunday month grid for month mode', () => {
      const { start, end } = rangeForView('month', cursor);
      expect(new Date(start).getDay()).toBe(1);
      expect(new Date(end).getDay()).toBe(0);
      expect(new Date(start).getTime()).toBeLessThanOrEqual(cursor.getTime());
      expect(new Date(end).getTime()).toBeGreaterThanOrEqual(cursor.getTime());
    });
  });

  describe('windowForCursor', () => {
    it('encompasses all 4 view ranges', () => {
      const win = windowForCursor(cursor);
      const winStart = new Date(win.start).getTime();
      const winEnd = new Date(win.end).getTime();

      for (const mode of ['day', 'week', 'month', 'agenda'] as const) {
        const range = rangeForView(mode, cursor);
        expect(new Date(range.start).getTime()).toBeGreaterThanOrEqual(winStart);
        expect(new Date(range.end).getTime()).toBeLessThanOrEqual(winEnd);
      }
    });
  });

  describe('shiftDateByView', () => {
    it('shifts by days in day mode', () => {
      expect(shiftDateByView(cursor, 'day', 1).getDate()).toBe(15);
      expect(shiftDateByView(cursor, 'day', -2).getDate()).toBe(12);
    });

    it('shifts by weeks in week and agenda modes', () => {
      expect(shiftDateByView(cursor, 'week', 1).getDate()).toBe(21);
      expect(shiftDateByView(cursor, 'agenda', -1).getDate()).toBe(7);
    });

    it('shifts by months in month mode', () => {
      expect(shiftDateByView(cursor, 'month', 1).getMonth()).toBe(10);
      expect(shiftDateByView(cursor, 'month', -1).getMonth()).toBe(8);
    });
  });
});
