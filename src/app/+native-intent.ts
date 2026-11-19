import { parseFirstIcsEvent } from '@/domain/icsParser';
import { isIcsSystemUri, readIcsFile } from '@/services/icsFileReader';
import { saveIcsImportPayload } from '@/services/icsImportDraft';

export async function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): Promise<string | null> {
  try {
    if (!isIcsSystemUri(path)) {
      return path;
    }

    const readResult = await readIcsFile(path);
    const payload = readResult.ok
      ? parseFirstIcsEvent(readResult.content)
      : readResult;

    const importId = saveIcsImportPayload(payload);
    return `/event/new?importId=${encodeURIComponent(importId)}`;
  } catch (error) {
    console.warn('[ics] unexpected error handling incoming intent:', error);
    const importId = saveIcsImportPayload({ ok: false, error: 'read_failed' });
    return `/event/new?importId=${encodeURIComponent(importId)}`;
  }
}
