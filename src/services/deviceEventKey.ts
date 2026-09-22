/**
 * Stable key for one visible occurrence pulled from the device calendar.
 *
 * expo-calendar returns each recurring instance with the same event `id`.
 * Using only that id in sync_map causes later instances to overwrite earlier
 * ones — typically leaving only an occurrence near the end of the pull window,
 * so the current month/week appears empty.
 */
export function deviceOccurrenceKey(event: {
  id: string;
  startDate: string | Date;
  instanceId?: string | null;
  originalStartDate?: string | Date | null;
}): string {
  if (event.instanceId) {
    return `inst:${event.instanceId}`;
  }

  const startSource = event.originalStartDate ?? event.startDate;
  const start = new Date(startSource);
  const startIso = Number.isNaN(start.getTime())
    ? String(startSource)
    : start.toISOString();

  return `evt:${event.id}:${startIso}`;
}

export function toEventIso(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid event date');
  }
  return date.toISOString();
}

/** Ensure start <= end; bump zero-length ranges by 1 minute for storage. */
export function normalizeEventRange(
  startAt: string,
  endAt: string,
): { startAt: string; endAt: string } {
  if (startAt < endAt) return { startAt, endAt };
  if (endAt < startAt) return { startAt: endAt, endAt: startAt };

  const end = new Date(startAt);
  end.setUTCMinutes(end.getUTCMinutes() + 1);
  return { startAt, endAt: end.toISOString() };
}
