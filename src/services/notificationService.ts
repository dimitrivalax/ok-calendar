import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  addDays,
  addHours,
  addMinutes,
  endOfDay,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';

import type { EventReminder } from '@/domain/types';
import { expandOccurrences } from '@/domain/recurrence';
import { getSetting } from '@/db/client';
import {
  DAILY_DIGEST_ENABLED_KEY,
  DAILY_DIGEST_ID_PREFIX,
  DAILY_DIGEST_TIME_KEY,
  DAILY_DIGEST_WINDOW_DAYS,
  digestNotificationId,
  fireAtForDay,
  formatDigestBody,
  isDailyDigestEnabled,
  parseDigestTime,
} from '@/services/dailyDigest';
import { EventRepository } from '@/services/eventRepository';
import i18n from '@/i18n';

type NotificationsModule = typeof import('expo-notifications');

type Subscription = { remove: () => void };

const REMINDER_CHANNEL_ID = 'event-reminders';
const DIGEST_CHANNEL_ID = 'daily-digest';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function notificationsSupported(): boolean {
  return Platform.OS !== 'web' && !isExpoGo;
}

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;
let reminderChannelReady = false;
let digestChannelReady = false;

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
              priority: mod.AndroidNotificationPriority.MAX,
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

async function ensureReminderChannel(
  Notifications: NotificationsModule,
): Promise<void> {
  if (Platform.OS !== 'android' || reminderChannelReady) return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: i18n.t('notifications:channelName'),
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility:
      Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
  reminderChannelReady = true;
}

async function ensureDigestChannel(
  Notifications: NotificationsModule,
): Promise<void> {
  if (Platform.OS !== 'android' || digestChannelReady) return;
  await Notifications.setNotificationChannelAsync(DIGEST_CHANNEL_ID, {
    name: i18n.t('notifications:digestChannelName'),
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility:
      Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
  digestChannelReady = true;
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

  async cancelDailyDigest(): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(DAILY_DIGEST_ID_PREFIX))
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

    await ensureReminderChannel(Notifications);

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
            data: {
              eventId: event.id,
              url: `/event/${event.id}`,
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            interruptionLevel: 'timeSensitive',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
      }
    }
  },

  async syncDailyDigest(): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    await this.cancelDailyDigest();

    const enabled = isDailyDigestEnabled(
      await getSetting(DAILY_DIGEST_ENABLED_KEY),
    );
    if (!enabled) return;

    const granted = await this.requestPermissions();
    if (!granted) return;

    await ensureDigestChannel(Notifications);

    const { hours, minutes } = parseDigestTime(
      await getSetting(DAILY_DIGEST_TIME_KEY),
    );
    const calendars = await EventRepository.listCalendars();
    const visibleIds = calendars.filter((c) => c.isVisible).map((c) => c.id);
    const now = new Date();
    const labels = {
      allDay: i18n.t('notifications:digestAllDay'),
      empty: i18n.t('notifications:digestEmptyBody'),
      more: (count: number) =>
        i18n.t('notifications:digestMore', { count }),
    };

    for (let offset = 0; offset < DAILY_DIGEST_WINDOW_DAYS; offset += 1) {
      const day = addDays(startOfDay(now), offset);
      const fireAt = fireAtForDay(day, hours, minutes);
      if (isBefore(fireAt, now)) continue;

      const rangeStart = startOfDay(day).toISOString();
      const rangeEnd = endOfDay(day).toISOString();
      const occurrences =
        visibleIds.length === 0
          ? []
          : expandOccurrences(
              await EventRepository.listInRange(
                rangeStart,
                rangeEnd,
                visibleIds,
              ),
              rangeStart,
              rangeEnd,
            );
      const dayKey = format(day, 'yyyy-MM-dd');
      const body = formatDigestBody(occurrences, labels);

      await Notifications.scheduleNotificationAsync({
        identifier: digestNotificationId(dayKey),
        content: {
          title: i18n.t('notifications:digestTitle'),
          body,
          data: {
            type: 'dailyDigest',
            date: dayKey,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: DIGEST_CHANNEL_ID,
        },
      });
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
    await this.syncDailyDigest();
  },
};

export type NotificationTap =
  | { type: 'event'; eventId: string }
  | { type: 'dailyDigest'; date: string };

function tapFromNotificationData(
  data: Record<string, unknown> | undefined,
): NotificationTap | null {
  if (!data) return null;

  if (data.type === 'dailyDigest') {
    const date = data.date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { type: 'dailyDigest', date };
    }
    return null;
  }

  const eventId = data.eventId;
  if (typeof eventId === 'string' && eventId.length > 0) {
    return { type: 'event', eventId };
  }

  const url = data.url;
  if (typeof url === 'string') {
    const match = url.match(/\/event\/([^/?#]+)/);
    if (match?.[1]) return { type: 'event', eventId: match[1] };
  }
  return null;
}

export function attachNotificationResponseListener(
  onTap: (tap: NotificationTap) => void,
): Subscription {
  if (!notificationsSupported()) {
    return { remove: () => undefined };
  }

  let active: Subscription | null = null;
  let cancelled = false;
  let handledRequestId: string | null = null;

  const deliver = (
    Notifications: NotificationsModule,
    response: {
      notification: {
        request: {
          identifier: string;
          content: { data?: Record<string, unknown> };
        };
      };
    },
  ) => {
    const requestId = response.notification.request.identifier;
    if (handledRequestId === requestId) return;
    const tap = tapFromNotificationData(
      response.notification.request.content.data,
    );
    if (!tap) return;
    handledRequestId = requestId;
    onTap(tap);
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      // Native module may omit clear on some platforms.
    }
  };

  void getNotifications().then((Notifications) => {
    if (!Notifications || cancelled) return;

    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) deliver(Notifications, last);
    } catch {
      // getLastNotificationResponse unavailable — listener still covers warm taps.
    }

    active = Notifications.addNotificationResponseReceivedListener((response) => {
      deliver(Notifications, response);
    });
  });

  return {
    remove: () => {
      cancelled = true;
      active?.remove();
    },
  };
}
