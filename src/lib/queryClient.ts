import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/**
 * Local-first QueryClient backed by SQLite (ADR-0002).
 * `networkMode: 'always'` ensures local SQLite queries and mutations never pause
 * when the device is offline, and `retry: false` avoids pointless backoff on DB errors.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      retry: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      networkMode: 'always',
      retry: false,
    },
  },
});

let focusListenerAttached = false;

export function attachAppStateFocusManager(): void {
  if (focusListenerAttached || Platform.OS === 'web') return;
  focusListenerAttached = true;

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener(
      'change',
      (status: AppStateStatus) => {
        handleFocus(status === 'active');
      },
    );
    return () => {
      subscription.remove();
    };
  });
}
