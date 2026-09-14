/** Validate user-provided URLs per security rules (http/https/mailto only). */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url || !url.trim()) return undefined;
  try {
    const parsed = new URL(url.trim());
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return url.trim();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function isValidOptionalUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  return safeUrl(url) !== undefined;
}
