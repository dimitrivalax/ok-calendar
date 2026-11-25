import { createStore, useSelector } from '@tanstack/react-store';

import { shiftDateByView } from '@/domain/calendarWindow';
import type { ViewMode } from '@/domain/types';
import {
  deviceLocale,
  type AppLocale,
  type LocalePreference,
} from '@/i18n';

export type CalendarUiState = {
  isReady: boolean;
  viewMode: ViewMode;
  cursorDate: Date;
  isLocalOnly: boolean;
  locale: AppLocale;
  localePreference: LocalePreference;
};

export function createInitialCalendarState(
  initialLocale: AppLocale = deviceLocale(),
): CalendarUiState {
  return {
    isReady: false,
    viewMode: 'day',
    cursorDate: new Date(),
    isLocalOnly: false,
    locale: initialLocale,
    localePreference: 'system',
  };
}

export const calendarStore = createStore<CalendarUiState>(
  createInitialCalendarState(),
);

export function setIsReady(isReady: boolean): void {
  calendarStore.setState((prev) =>
    prev.isReady === isReady ? prev : { ...prev, isReady },
  );
}

export function setViewMode(viewMode: ViewMode): void {
  calendarStore.setState((prev) =>
    prev.viewMode === viewMode ? prev : { ...prev, viewMode },
  );
}

export function setCursorDate(cursorDate: Date): void {
  calendarStore.setState((prev) => ({ ...prev, cursorDate }));
}

export function goToday(): void {
  setCursorDate(new Date());
}

export function shiftPeriod(delta: number): void {
  calendarStore.setState((prev) => ({
    ...prev,
    cursorDate: shiftDateByView(prev.cursorDate, prev.viewMode, delta),
  }));
}

export function setIsLocalOnly(isLocalOnly: boolean): void {
  calendarStore.setState((prev) =>
    prev.isLocalOnly === isLocalOnly ? prev : { ...prev, isLocalOnly },
  );
}

export function setLocaleState(
  localePreference: LocalePreference,
  locale: AppLocale,
): void {
  calendarStore.setState((prev) =>
    prev.localePreference === localePreference && prev.locale === locale
      ? prev
      : { ...prev, localePreference, locale },
  );
}

export function setResolvedLocale(locale: AppLocale): void {
  calendarStore.setState((prev) =>
    prev.locale === locale ? prev : { ...prev, locale },
  );
}

export function resetCalendarStore(initialLocale?: AppLocale): void {
  calendarStore.setState(() => createInitialCalendarState(initialLocale));
}

export function useIsAppReady(): boolean {
  return useSelector(calendarStore, (s) => s.isReady);
}

export function useViewMode(): ViewMode {
  return useSelector(calendarStore, (s) => s.viewMode);
}

export function useCursorDate(): Date {
  return useSelector(calendarStore, (s) => s.cursorDate);
}

export function useIsLocalOnly(): boolean {
  return useSelector(calendarStore, (s) => s.isLocalOnly);
}

export function useLocale(): AppLocale {
  return useSelector(calendarStore, (s) => s.locale);
}

export function useLocalePreference(): LocalePreference {
  return useSelector(calendarStore, (s) => s.localePreference);
}
