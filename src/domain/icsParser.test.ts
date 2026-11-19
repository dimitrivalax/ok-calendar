import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { parseFirstIcsEvent } from './icsParser';

const DOCTOLIB_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Doctolib//Doctolib Calendar//FR',
  'BEGIN:VEVENT',
  'UID:doctolib-123@doctolib.fr',
  'DTSTAMP:20261119T130000Z',
  'DTSTART;TZID=Europe/Paris:20261119T153000',
  'DTEND;TZID=Europe/Paris:20261119T154500',
  'SUMMARY:Rendez-vous chez Dr Cassandre ROCHE',
  'LOCATION:17 Rue du 14 Juillet\\, 31810 Venerque',
  'DESCRIPTION:Informations pratiques :\\n* Au Rez-de-chaussée\\n* Sans ascense',
  ' ur\\n\\nPour annuler ou déplacer votre RDV\\, cliquez sur le lien ci-dessous',
  '  :\\nhttps://www.doctolib.fr/guest_access/uabTaDFz?anonymous_origin=ics_att',
  ' achment\\n\\nVia Doctolib',
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  'DESCRIPTION:Reminder',
  'TRIGGER:-PT30M',
  'END:VALARM',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('parseFirstIcsEvent', () => {
  it('parses a Doctolib appointment with Europe/Paris TZID, VALARM, folded description and escaped commas', () => {
    const result = parseFirstIcsEvent(DOCTOLIB_ICS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.totalEvents).toBe(1);
    expect(result.unsupportedRecurrence).toBe(false);
    expect(result.draft.title).toBe('Rendez-vous chez Dr Cassandre ROCHE');
    expect(result.draft.allDay).toBe(false);
    // 2026-11-19 is CET (UTC+1), so 15:30 Europe/Paris === 14:30 UTC
    expect(result.draft.startAt).toBe('2026-11-19T14:30:00.000Z');
    expect(result.draft.endAt).toBe('2026-11-19T14:45:00.000Z');
    expect(result.draft.location).toBe('17 Rue du 14 Juillet, 31810 Venerque');
    expect(result.draft.description).toContain('Au Rez-de-chaussée');
    expect(result.draft.description).toContain('Sans ascenseur');
    expect(result.draft.description).toContain(
      'https://www.doctolib.fr/guest_access/uabTaDFz?anonymous_origin=ics_attachment',
    );
    expect(result.draft.recurrence).toBe('none');
    expect(result.draft.notifications).toEqual([
      { id: '', type: 'minutes_before', value: 30 },
    ]);
  });

  it('parses UTC events with valid URL property', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261201T090000Z',
      'DTEND:20261201T103000Z',
      'SUMMARY:Design review',
      'URL:https://meet.example.com/room-42',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.startAt).toBe('2026-12-01T09:00:00.000Z');
    expect(result.draft.endAt).toBe('2026-12-01T10:30:00.000Z');
    expect(result.draft.url).toBe('https://meet.example.com/room-42');
    expect(result.draft.notifications).toBeUndefined();
  });

  it('handles single-day all-day events with exclusive RFC 5545 DTEND', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261120',
      'DTEND;VALUE=DATE:20261121',
      'SUMMARY:Congé',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.allDay).toBe(true);
    const start = parseISO(result.draft.startAt!);
    const end = parseISO(result.draft.endAt!);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(10); // November
    expect(start.getDate()).toBe(20);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(10);
    expect(end.getDate()).toBe(20);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('handles multi-day all-day events', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261120',
      'DTEND;VALUE=DATE:20261123',
      'SUMMARY:Conférence 3 jours',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const start = parseISO(result.draft.startAt!);
    const end = parseISO(result.draft.endAt!);
    expect(start.getDate()).toBe(20);
    expect(end.getDate()).toBe(22);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('supports DURATION when DTEND is omitted', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261119T100000Z',
      'DURATION:PT45M',
      'SUMMARY:Standup',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.startAt).toBe('2026-11-19T10:00:00.000Z');
    expect(result.draft.endAt).toBe('2026-11-19T10:45:00.000Z');
  });

  it('falls back to start + 1 hour when DTEND is missing or equal to DTSTART', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261119T100000Z',
      'DTEND:20261119T100000Z',
      'SUMMARY:Zero duration',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.startAt).toBe('2026-11-19T10:00:00.000Z');
    expect(result.draft.endAt).toBe('2026-11-19T11:00:00.000Z');
  });

  it('resolves embedded VTIMEZONE definitions (e.g. Outlook Romance Standard Time)', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VTIMEZONE',
      'TZID:Romance Standard Time',
      'BEGIN:STANDARD',
      'DTSTART:16011028T030000',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:16010325T020000',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'DTSTART;TZID="Romance Standard Time":20260715T140000',
      'DTEND;TZID="Romance Standard Time":20260715T150000',
      'SUMMARY:Réunion été',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // July is CEST (UTC+2), so 14:00 -> 12:00 UTC
    expect(result.draft.startAt).toBe('2026-07-15T12:00:00.000Z');
    expect(result.draft.endAt).toBe('2026-07-15T13:00:00.000Z');
  });

  it('maps VALARM triggers across days, hours, minutes, zero offset, and ignores post-start alarms', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261119T100000Z',
      'DTEND:20261119T110000Z',
      'SUMMARY:Alarms',
      'BEGIN:VALARM',
      'TRIGGER:-P2D',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:PT0S',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:PT10M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.notifications).toEqual([
      { id: '', type: 'days_before', value: 2 },
      { id: '', type: 'hours_before', value: 2 },
      { id: '', type: 'minutes_before', value: 15 },
      { id: '', type: 'minutes_before', value: 0 },
    ]);
  });

  it('maps simple and complex RRULE frequencies', () => {
    const simpleIcs = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261119T100000Z',
      'DTEND:20261119T110000Z',
      'SUMMARY:Weekly sync',
      'RRULE:FREQ=WEEKLY',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const simple = parseFirstIcsEvent(simpleIcs);
    expect(simple.ok).toBe(true);
    if (simple.ok) {
      expect(simple.draft.recurrence).toBe('weekly');
      expect(simple.unsupportedRecurrence).toBe(false);
    }

    const complexIcs = simpleIcs.replace(
      'RRULE:FREQ=WEEKLY',
      'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH',
    );
    const complex = parseFirstIcsEvent(complexIcs);
    expect(complex.ok).toBe(true);
    if (complex.ok) {
      expect(complex.draft.recurrence).toBe('weekly');
      expect(complex.unsupportedRecurrence).toBe(true);
    }
  });

  it('returns totalEvents count and imports the first VEVENT when multiple exist', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261119T090000Z',
      'DTEND:20261119T100000Z',
      'SUMMARY:First event',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART:20261120T090000Z',
      'DTEND:20261120T100000Z',
      'SUMMARY:Second event',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.totalEvents).toBe(2);
    expect(result.draft.title).toBe('First event');
  });

  it('rejects unsafe URL schemes and truncates overly long titles', () => {
    const longTitle = 'A'.repeat(250);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20261119T090000Z',
      'DTEND:20261119T100000Z',
      `SUMMARY:${longTitle}`,
      'URL:javascript:alert(1)',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseFirstIcsEvent(ics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.url).toBeNull();
    expect(result.draft.title).toHaveLength(200);
  });

  it('returns structured errors for invalid, empty, or eventless files', () => {
    expect(parseFirstIcsEvent('')).toEqual({ ok: false, error: 'invalid_ics' });
    expect(parseFirstIcsEvent('not a calendar')).toEqual({
      ok: false,
      error: 'invalid_ics',
    });
    expect(
      parseFirstIcsEvent('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR'),
    ).toEqual({
      ok: false,
      error: 'no_events',
    });
    expect(
      parseFirstIcsEvent(
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:No start\r\nEND:VEVENT\r\nEND:VCALENDAR',
      ),
    ).toEqual({
      ok: false,
      error: 'missing_start',
    });
  });
});
