import { describe, expect, it } from 'vitest';

import { isValidEventRange } from '../domain/recurrence';
import {
  deviceOccurrenceKey,
  normalizeEventRange,
  toEventIso,
} from './deviceEventKey';

describe('deviceOccurrenceKey', () => {
  it('prefers Android instanceId when present', () => {
    expect(
      deviceOccurrenceKey({
        id: '42',
        startDate: '2026-09-22T10:00:00.000Z',
        instanceId: '9001',
      }),
    ).toBe('inst:9001');
  });

  it('distinguishes recurring instances that share an event id', () => {
    const a = deviceOccurrenceKey({
      id: 'series-1',
      startDate: '2026-09-22T09:00:00.000Z',
    });
    const b = deviceOccurrenceKey({
      id: 'series-1',
      startDate: '2026-09-29T09:00:00.000Z',
    });
    expect(a).not.toBe(b);
    expect(a).toContain('series-1');
    expect(b).toContain('series-1');
  });

  it('uses originalStartDate when provided', () => {
    expect(
      deviceOccurrenceKey({
        id: 'series-1',
        startDate: '2026-09-22T09:00:00.000Z',
        originalStartDate: '2026-09-15T09:00:00.000Z',
      }),
    ).toBe('evt:series-1:2026-09-15T09:00:00.000Z');
  });
});

describe('normalizeEventRange', () => {
  it('keeps ordered ranges', () => {
    expect(
      normalizeEventRange(
        '2026-09-22T09:00:00.000Z',
        '2026-09-22T10:00:00.000Z',
      ),
    ).toEqual({
      startAt: '2026-09-22T09:00:00.000Z',
      endAt: '2026-09-22T10:00:00.000Z',
    });
  });

  it('extends zero-duration events by one minute', () => {
    expect(
      normalizeEventRange(
        '2026-09-22T09:00:00.000Z',
        '2026-09-22T09:00:00.000Z',
      ),
    ).toEqual({
      startAt: '2026-09-22T09:00:00.000Z',
      endAt: '2026-09-22T09:01:00.000Z',
    });
  });
});

describe('toEventIso', () => {
  it('accepts Date and ISO strings', () => {
    expect(toEventIso('2026-09-22T09:00:00.000Z')).toBe(
      '2026-09-22T09:00:00.000Z',
    );
    expect(toEventIso(new Date('2026-09-22T09:00:00.000Z'))).toBe(
      '2026-09-22T09:00:00.000Z',
    );
  });
});

describe('isValidEventRange', () => {
  it('allows equal start and end', () => {
    expect(
      isValidEventRange(
        '2026-09-22T09:00:00.000Z',
        '2026-09-22T09:00:00.000Z',
      ),
    ).toBe(true);
  });
});
