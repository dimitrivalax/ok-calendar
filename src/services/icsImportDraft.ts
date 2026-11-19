import type { IcsEventDraft, IcsParseErrorCode } from '@/domain/icsParser';

export type IcsImportErrorCode =
  | IcsParseErrorCode
  | 'read_failed'
  | 'file_too_large';

export type IcsImportPayload =
  | {
      ok: true;
      draft: IcsEventDraft;
      totalEvents: number;
      unsupportedRecurrence: boolean;
    }
  | {
      ok: false;
      error: IcsImportErrorCode;
    };

const MAX_STORED_IMPORTS = 5;
const store = new Map<string, IcsImportPayload>();
let sequence = 0;

export function saveIcsImportPayload(payload: IcsImportPayload): string {
  sequence += 1;
  const id = `ics-${sequence}`;
  store.set(id, payload);

  // Keep memory bounded while allowing React StrictMode double renders to read the same id.
  while (store.size > MAX_STORED_IMPORTS) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }

  return id;
}

export function getIcsImportPayload(
  id: string | undefined,
): IcsImportPayload | undefined {
  if (!id) return undefined;
  return store.get(id);
}

export function clearIcsImportPayload(id: string | undefined): void {
  if (!id) return;
  store.delete(id);
}
