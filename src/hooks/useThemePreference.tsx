import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { getSetting, setSetting } from '@/db/client';
import type { ModeType } from '@/components/ui/gluestack-ui-provider';

export type ThemePreference = ModeType;

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedScheme: 'light' | 'dark';
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getSetting('theme');
      if (!cancelled && isThemePreference(saved)) {
        setPreferenceState(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = async (next: ThemePreference) => {
    await setSetting('theme', next);
    setPreferenceState(next);
  };

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  return (
    <ThemePreferenceContext.Provider
      value={{ preference, resolvedScheme, setPreference }}
    >
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error(
      'useThemePreference must be used within ThemePreferenceProvider',
    );
  }
  return ctx;
}
