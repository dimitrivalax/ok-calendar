import { Stack, useRouter } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { CalendarProvider } from '@/hooks/useCalendarContext';
import i18n from '@/i18n';
import { href } from '@/navigation/href';
import { attachNotificationResponseListener } from '@/services/notificationService';
import '../../global.css';

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

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="system">
      <I18nextProvider i18n={i18n}>
        <CalendarProvider>
          <StatusBar style="auto" />
          <NotificationBridge />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(calendar)" options={{ headerShown: false }} />
            <Stack.Screen name="event/new" options={{ presentation: 'modal', title: 'New' }} />
            <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
            <Stack.Screen name="event/edit/[id]" options={{ presentation: 'modal', title: 'Edit' }} />
            <Stack.Screen name="calendars/index" options={{ title: 'Calendars' }} />
            <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
          </Stack>
        </CalendarProvider>
      </I18nextProvider>
    </GluestackUIProvider>
  );
}
