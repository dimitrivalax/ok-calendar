import { describe, expect, it } from 'vitest';

import { alarmsToReminders } from './deviceAlarms';

describe('alarmsToReminders', () => {
  const startAt = '2026-09-23T10:00:00.000Z';

  it('returns empty when alarms are missing', () => {
    expect(alarmsToReminders(undefined, startAt)).toEqual([]);
    expect(alarmsToReminders([], startAt)).toEqual([]);
  });

  it('maps relative offsets to reminder types', () => {
    expect(
      alarmsToReminders(
        [
          { relativeOffset: 0 },
          { relativeOffset: -5 },
          { relativeOffset: -120 },
          { relativeOffset: -1440 },
        ],
        startAt,
      ),
    ).toEqual([
      { type: 'at_event', value: 0 },
      { type: 'minutes_before', value: 5 },
      { type: 'hours_before', value: 2 },
      { type: 'days_before', value: 1 },
    ]);
  });

  it('maps absoluteDate alarms relative to start', () => {
    expect(
      alarmsToReminders(
        [{ absoluteDate: '2026-09-23T09:45:00.000Z' }],
        startAt,
      ),
    ).toEqual([{ type: 'minutes_before', value: 15 }]);
  });

  it('drops after-start alarms and duplicates', () => {
    expect(
      alarmsToReminders(
        [
          { relativeOffset: 10 },
          { relativeOffset: -5 },
          { relativeOffset: -5 },
        ],
        startAt,
      ),
    ).toEqual([{ type: 'minutes_before', value: 5 }]);
  });
});
