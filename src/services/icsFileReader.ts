import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export const MAX_ICS_BYTES = 2 * 1024 * 1024; // 2 MB

export type IcsReadResult =
  | { ok: true; content: string }
  | { ok: false; error: 'file_too_large' | 'read_failed' };

/**
 * Detect system-provided file URIs (Android content:// or file://, iOS file:// Inbox)
 * so Expo Router can redirect them into the event creation flow instead of unmatched routes.
 */
export function isIcsSystemUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  const lower = uri.trim().toLowerCase();
  return lower.startsWith('content://') || lower.startsWith('file://');
}

function isIosInboxFile(uri: string): boolean {
  if (Platform.OS !== 'ios') return false;
  return uri.startsWith('file://') && uri.includes('/Documents/Inbox/');
}

/**
 * Read a local .ics file from an Android content:// / file:// URI or iOS file:// URI.
 * Cleans up the copied file in iOS Documents/Inbox after reading.
 */
export async function readIcsFile(uri: string): Promise<IcsReadResult> {
  const file = new File(uri);

  try {
    try {
      const size = file.size;
      if (typeof size === 'number' && size > MAX_ICS_BYTES) {
        return { ok: false, error: 'file_too_large' };
      }
    } catch {
      // Some Android content providers don't expose file size ahead of reading.
    }

    const content = await file.text();
    if (content.length > MAX_ICS_BYTES) {
      return { ok: false, error: 'file_too_large' };
    }

    return { ok: true, content };
  } catch (error) {
    console.warn('[ics] failed to read incoming file:', error);
    return { ok: false, error: 'read_failed' };
  } finally {
    if (isIosInboxFile(uri)) {
      try {
        file.delete();
      } catch {
        // Best-effort cleanup of iOS Inbox copy.
      }
    }
  }
}
