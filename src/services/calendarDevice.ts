import { Platform } from 'react-native';

import type { Calendar } from '@/domain/types';
import { createId } from '@/domain/id';
import { EventRepository } from '@/services/eventRepository';
import { getDb } from '@/db/client';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

const mockCalendars: Calendar[] = [];

async function ensureMockSeed() {
  if (mockCalendars.length > 0) return;
  const now = new Date().toISOString();
  mockCalendars.push({
    id: 'mock-device-1',
    deviceCalendarId: 'mock-device-1',
    title: 'Work (mock)',
    color: '#34A853',
    source: 'device',
    allowsModifications: true,
    isVisible: true,
    isPrimary: false,
    syncEnabled: true,
    createdAt: now,
    updatedAt: now,
  });
}

/** Device calendar access — mock on web, expo-calendar on native. */
export const CalendarService = {
  async requestPermissions(): Promise<PermissionState> {
    if (Platform.OS === 'web') {
      await ensureMockSeed();
      return 'granted';
    }

    try {
      const Calendar = await import('expo-calendar/legacy');
      const current = await Calendar.getCalendarPermissionsAsync();
      if (current.granted) return 'granted';
      const next = await Calendar.requestCalendarPermissionsAsync();
      return next.granted ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  },

  async listDevice(): Promise<Calendar[]> {
    if (Platform.OS === 'web') {
      await ensureMockSeed();
      return [...mockCalendars];
    }

    try {
      const Calendar = await import('expo-calendar/legacy');
      const permission = await Calendar.getCalendarPermissionsAsync();
      if (!permission.granted) return [];

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );
      const now = new Date().toISOString();
      return calendars.map((cal) => ({
        id: `device:${cal.id}`,
        deviceCalendarId: cal.id,
        title: cal.title,
        color: cal.color ?? '#208AEF',
        source: 'device' as const,
        allowsModifications: !!cal.allowsModifications,
        isVisible: true,
        isPrimary: !!cal.isPrimary,
        syncEnabled: true,
        createdAt: now,
        updatedAt: now,
      }));
    } catch {
      return [];
    }
  },

  async syncDeviceCalendarsIntoDb(): Promise<Calendar[]> {
    const deviceCals = await this.listDevice();
    const db = await getDb();
    const now = new Date().toISOString();

    for (const cal of deviceCals) {
      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM calendars WHERE device_calendar_id = ?`,
        cal.deviceCalendarId,
      );
      if (existing) {
        await db.runAsync(
          `UPDATE calendars SET title = ?, color = ?, allows_modifications = ?, updated_at = ? WHERE id = ?`,
          cal.title,
          cal.color,
          cal.allowsModifications ? 1 : 0,
          now,
          existing.id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO calendars (
            id, device_calendar_id, title, color, source,
            allows_modifications, is_visible, is_primary, sync_enabled,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'device', ?, 1, ?, 1, ?, ?)`,
          createId(),
          cal.deviceCalendarId,
          cal.title,
          cal.color,
          cal.allowsModifications ? 1 : 0,
          cal.isPrimary ? 1 : 0,
          now,
          now,
        );
      }
    }

    return EventRepository.listCalendars();
  },
};
