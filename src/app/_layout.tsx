import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  useRouter,
} from 'expo-router';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { I18nextProvider } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { CalendarProvider } from '@/hooks/useCalendarContext';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '@/hooks/useThemePreference';
import i18n from '@/i18n';
import { href } from '@/navigation/href';
import { attachNotificationResponseListener } from '@/services/notificationService';
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
  useEffect(() => {
    const sub = attachNotificationResponseListener((eventId) => {
      router.push(href(`/event/${eventId}`));
    });
    return () => sub.remove();
  }, [router]);
  return null;
}

function RootLayoutNav() {
  const { preference, resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';

  return (
    <GluestackUIProvider mode={preference}>
      <ThemeProvider value={isDark ? darkTheme : lightTheme}>
        <I18nextProvider i18n={i18n}>
          <CalendarProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NotificationBridge />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(calendar)" options={{ headerShown: false }} />
              <Stack.Screen name="event/new" options={{ presentation: 'modal', title: 'New' }} />
              <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
              <Stack.Screen name="event/edit/[id]" options={{ presentation: 'modal', title: 'Edit' }} />
              <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
            </Stack>
          </CalendarProvider>
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
    <ThemePreferenceProvider>
      <RootLayoutNav />
    </ThemePreferenceProvider>
  );
}
