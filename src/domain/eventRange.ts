import { addHours, parseISO, set } from 'date-fns';

/**
 * Computes the next endAt when the user changes start date or time during
 * event creation. Date changes copy the start calendar day onto end (keeping
 * end's time-of-day). Time changes set end to start + 1 hour.
 */
export function nextEndAtFromStartChange(
  startIso: string,
  currentEndIso: string,
  part: 'date' | 'time',
): string {
  if (part === 'time') {
    return addHours(parseISO(startIso), 1).toISOString();
  }

  const start = parseISO(startIso);
  const end = parseISO(currentEndIso);
  let nextEnd = set(end, {
    year: start.getFullYear(),
    month: start.getMonth(),
    date: start.getDate(),
  });
  if (nextEnd <= start) {
    nextEnd = addHours(start, 1);
  }
  return nextEnd.toISOString();
}
