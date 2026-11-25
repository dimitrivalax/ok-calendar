import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calendarStore,
  goToday,
  resetCalendarStore,
  setCursorDate,
  setIsLocalOnly,
  setIsReady,
  setLocaleState,
  setResolvedLocale,
  setViewMode,
  shiftPeriod,
} from './calendarStore';

vi.mock('@/i18n', () => ({
  deviceLocale: () => 'en' as const,
}));

describe('calendarStore', () => {
  beforeEach(() => {
    resetCalendarStore('en');
  });

  it('initializes with sensible defaults', () => {
    expect(calendarStore.state.isReady).toBe(false);
    expect(calendarStore.state.viewMode).toBe('day');
    expect(calendarStore.state.isLocalOnly).toBe(false);
    expect(calendarStore.state.locale).toBe('en');
    expect(calendarStore.state.localePreference).toBe('system');
  });

  it('updates viewMode and avoids redundant state transitions', () => {
    const listener = vi.fn();
    const sub = calendarStore.subscribe(listener);

    setViewMode('month');
    expect(calendarStore.state.viewMode).toBe('month');
    expect(listener).toHaveBeenCalledTimes(1);

    setViewMode('month');
    expect(listener).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
  });

  it('shifts cursorDate according to current viewMode', () => {
    const base = new Date(2026, 9, 14, 10, 0, 0);
    setCursorDate(base);

    setViewMode('day');
    shiftPeriod(1);
    expect(calendarStore.state.cursorDate.getDate()).toBe(15);

    setViewMode('week');
    shiftPeriod(1);
    expect(calendarStore.state.cursorDate.getDate()).toBe(22);

    setViewMode('agenda');
    shiftPeriod(-1);
    expect(calendarStore.state.cursorDate.getDate()).toBe(15);

    setViewMode('month');
    shiftPeriod(1);
    expect(calendarStore.state.cursorDate.getMonth()).toBe(10);
  });

  it('resets cursorDate to today via goToday', () => {
    setCursorDate(new Date(2020, 0, 1));
    goToday();
    const now = new Date();
    expect(calendarStore.state.cursorDate.getFullYear()).toBe(now.getFullYear());
    expect(calendarStore.state.cursorDate.getMonth()).toBe(now.getMonth());
    expect(calendarStore.state.cursorDate.getDate()).toBe(now.getDate());
  });

  it('updates bootstrap, permission, and locale flags', () => {
    setIsReady(true);
    setIsLocalOnly(true);
    setLocaleState('fr', 'fr');
    expect(calendarStore.state.isReady).toBe(true);
    expect(calendarStore.state.isLocalOnly).toBe(true);
    expect(calendarStore.state.localePreference).toBe('fr');
    expect(calendarStore.state.locale).toBe('fr');

    setResolvedLocale('en');
    expect(calendarStore.state.locale).toBe('en');
    expect(calendarStore.state.localePreference).toBe('fr');
  });
});
