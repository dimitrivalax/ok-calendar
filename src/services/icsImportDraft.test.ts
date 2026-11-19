import { describe, expect, it } from 'vitest';

import {
  clearIcsImportPayload,
  getIcsImportPayload,
  saveIcsImportPayload,
} from './icsImportDraft';

describe('icsImportDraft', () => {
  it('saves, retrieves idempotently, and clears an import payload', () => {
    const id = saveIcsImportPayload({
      ok: true,
      draft: { title: 'Test' },
      totalEvents: 1,
      unsupportedRecurrence: false,
    });

    expect(getIcsImportPayload(id)).toEqual({
      ok: true,
      draft: { title: 'Test' },
      totalEvents: 1,
      unsupportedRecurrence: false,
    });
    // Second read must still return the payload (React StrictMode safety).
    expect(getIcsImportPayload(id)?.ok).toBe(true);

    clearIcsImportPayload(id);
    expect(getIcsImportPayload(id)).toBeUndefined();
  });

  it('evicts the oldest entries beyond the bounded limit', () => {
    const ids: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      ids.push(
        saveIcsImportPayload({
          ok: false,
          error: 'invalid_ics',
        }),
      );
    }

    expect(getIcsImportPayload(ids[0])).toBeUndefined();
    expect(getIcsImportPayload(ids[1])).toBeUndefined();
    expect(getIcsImportPayload(ids[6])).toEqual({
      ok: false,
      error: 'invalid_ics',
    });
  });
});
