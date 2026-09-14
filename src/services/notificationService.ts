import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { addDays, addHours, addMinutes, parseISO, isBefore } from 'date-fns';

import type { CalendarEvent, EventReminder } from '@/domain/types';
import { expandOccurrences } from '@/domain/recurrence';
import { EventRepository } from '@/services/eventRepository';
import i18n from '@/i18n';

type NotificationsModule = typeof import('expo-notifications');

type Subscription = { remove: () => void };

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function notificationsSupported(): boolean {
  return Platform.OS !== 'web' && !isExpoGo;
}

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsSupported()) return null;
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications')
      .then((mod) => {
        if (!handlerConfigured) {
          handlerConfigured = true;
          mod.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowAlert: true,
            }),
          });
        }
        return mod;
      })
      .catch((error) => {
        console.warn('[notifications] unavailable:', error);
        return null;
      });
  }
  return notificationsPromise;
}

function reminderFireAt(
  occurrenceStart: string,
  reminder: EventReminder,
): Date {
  const start = parseISO(occurrenceStart);
  switch (reminder.type) {
    case 'at_event':
      return start;
    case 'minutes_before':
      return addMinutes(start, -reminder.value);
    case 'hours_before':
      return addHours(start, -reminder.value);
    case 'days_before':
      return addDays(start, -reminder.value);
  }
}

function notifId(
  eventId: string,
  reminderId: string,
  occurrenceStart: string,
): string {
  return `notif:${eventId}:${reminderId}:${occurrenceStart}`;
}

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    const Notifications = await getNotifications();
    if (!Notifications) return false;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  },

  async cancelForEvent(eventId: string): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prefix = `notif:${eventId}:`;
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) =>
          Notifications.cancelScheduledNotificationAsync(n.identifier),
        ),
    );
  },

  async syncForEvent(eventId: string): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    await this.cancelForEvent(eventId);
    const event = await EventRepository.getById(eventId);
    if (!event || event.deletedAt || event.notifications.length === 0) return;

    const granted = await this.requestPermissions();
    if (!granted) return;

    const now = new Date();
    const windowEnd = addDays(now, 90).toISOString();
    const occurrences = expandOccurrences([event], now.toISOString(), windowEnd);

    for (const occ of occurrences) {
      for (const reminder of event.notifications) {
        const fireAt = reminderFireAt(occ.occurrenceStart, reminder);
        if (isBefore(fireAt, now)) continue;

        const id = notifId(event.id, reminder.id, occ.occurrenceStart);
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: i18n.t('notifications:reminderTitle'),
            body: i18n.t('notifications:reminderBody', { title: event.title }),
            data: { eventId: event.id, url: `okcalendar://event/${event.id}` },
          },
          trigger: {
            type: 'date',
            date: fireAt,
          } as import('expo-notifications').NotificationTriggerInput,
        });
      }
    }
  },

  async resyncWindow(): Promise<void> {
    if (!notificationsSupported()) return;
    const now = new Date();
    const events = await EventRepository.listInRange(
      now.toISOString(),
      addDays(now, 90).toISOString(),
    );
    for (const event of events) {
      await this.syncForEvent(event.id);
    }
  },
};

export function attachNotificationResponseListener(
  onEvent: (eventId: string) => void,
): Subscription {
  if (!notificationsSupported()) {
    return { remove: () => undefined };
  }

  let active: Subscription | null = null;
  let cancelled = false;

  void getNotifications().then((Notifications) => {
    if (!Notifications || cancelled) return;
    active = Notifications.addNotificationResponseReceivedListener((response) => {
      const eventId = response.notification.request.content.data?.eventId;
      if (typeof eventId === 'string') onEvent(eventId);
    });
  });

  return {
    remove: () => {
      cancelled = true;
      active?.remove();
    },
  };
}
