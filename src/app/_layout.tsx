import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider, useTranslation } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppBootstrap } from '@/components/AppBootstrap';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '@/hooks/useThemePreference';
import i18n from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { href } from '@/navigation/href';
import { attachNotificationResponseListener } from '@/services/notificationService';
import {
  setCursorDate,
  setViewMode,
  useLocale,
} from '@/state/calendarStore';
import '@/services/backgroundSync';
import '../../global.css';

SplashScreen.preventAutoHideAsync();

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#39AFEA',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1919',
    border: '#D8DADE',
    notification: '#E25561',
  },
};

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#4DB7EC',
    background: '#1A1919',
    card: '#2F2F2F',
    text: '#F6F8FC',
    border: '#545454',
    notification: '#E56671',
  },
};

function NotificationBridge() {
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

    const sub = attachNotificationResponseListener((tap) => {
      // Defer so index → calendar redirect can settle on cold start.
      const timer = setTimeout(() => {
        pendingTimers.delete(timer);
        if (tap.type === 'dailyDigest' || tap.type === 'tomorrowDigest') {
          const [year, month, day] = tap.date.split('-').map(Number);
          setViewMode('day');
          setCursorDate(new Date(year, month - 1, day));
          router.push(href('/(calendar)'));
          return;
        }
        router.push(href(`/event/${tap.eventId}`));
      }, 0);
      pendingTimers.add(timer);
    });

    return () => {
      sub.remove();
      for (const timer of pendingTimers) clearTimeout(timer);
      pendingTimers.clear();
    };
  }, [router, navigationState?.key]);
  return null;
}

function RootStack() {
  const { t } = useTranslation(['event', 'settings', 'calendar']);
  // Re-render stack titles when the app locale changes.
  const locale = useLocale();

  return (
    <Stack key={locale}>

      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(calendar)" options={{ headerShown: false }} />
      <Stack.Screen
        name="event/new"
        options={{ presentation: 'modal', title: t('event:navNew') }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{ title: t('event:navDetail') }}
      />
      <Stack.Screen
        name="event/edit/[id]"
        options={{ presentation: 'modal', title: t('event:navEdit') }}
      />
      <Stack.Screen
        name="settings/index"
        options={{ title: t('settings:title') }}
      />
      <Stack.Screen
        name="search/index"
        options={{ title: t('calendar:search') }}
      />
    </Stack>
  );
}

function RootLayoutNav() {
  const { preference, resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';

  return (
    <GluestackUIProvider mode={preference}>
      <ThemeProvider value={isDark ? darkTheme : lightTheme}>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <AppBootstrap />
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NotificationBridge />
            <RootStack />
          </QueryClientProvider>
        </I18nextProvider>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <RootLayoutNav />
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
