import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { getDb, getSetting } from '@/db/client';
import { isLocalePreference, resolveLocale, setAppLocale } from '@/i18n';
import { NotificationService } from '@/services/notificationService';
import { SyncEngine } from '@/services/syncEngine';

export const BACKGROUND_SYNC_TASK = 'background-calendar-sync';

/** Minimum interval in minutes (15 min is the OS floor on Android/iOS). */
export const BACKGROUND_SYNC_INTERVAL_MINUTES = 15;

export type BackgroundSyncAvailability =
  | 'available'
  | 'restricted'
  | 'unsupported';

/**
 * Headless sync runner executed when the OS wakes the app in background.
 * Fetches new/updated events from system calendars into SQLite,
 * pushes local pending edits, and recalculates the notification window.
 */
export async function performBackgroundSync(): Promise<boolean> {
  try {
    // Ensure SQLite database and tables are ready
    await getDb();

    // Ensure user locale preference is loaded so reminder bodies match language
    const savedLocale = await getSetting('locale');
    if (isLocalePreference(savedLocale)) {
      await setAppLocale(resolveLocale(savedLocale));
    }

    // Pull events from system calendars into SQLite
    await SyncEngine.pull();

    // Push any local events that were saved while offline
    await SyncEngine.pushAllPending();

    // Ensure the rolling 90-day reminders and daily digests are up-to-date
    await NotificationService.resyncWindow();

    return true;
  } catch (error) {
    console.warn('[BackgroundSync] sync execution failed:', error);
    return false;
  }
}

// Define the background task at the module level.
// This MUST happen on bundle initialization so the OS can invoke it in headless mode.
if (Platform.OS !== 'web') {
  try {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      const success = await performBackgroundSync();
      return success
        ? BackgroundTask.BackgroundTaskResult.Success
        : BackgroundTask.BackgroundTaskResult.Failed;
    });
  } catch (error) {
    console.warn('[BackgroundSync] failed to define task:', error);
  }
}

/** Check availability of background tasks on the current device. */
export async function getBackgroundSyncAvailability(): Promise<BackgroundSyncAvailability> {
  if (Platform.OS === 'web') return 'unsupported';

  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available) {
      return 'available';
    }
    return 'restricted';
  } catch {
    return 'unsupported';
  }
}

/** Check if the background sync task is currently registered. */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch {
    return false;
  }
}

/** Register the background sync task if supported and not already registered. */
export async function registerBackgroundSyncTask(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const availability = await getBackgroundSyncAvailability();
    if (availability !== 'available') {
      console.warn(
        '[BackgroundSync] background execution not available:',
        availability,
      );
      return false;
    }

    const alreadyRegistered = await isBackgroundSyncRegistered();
    if (!alreadyRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: BACKGROUND_SYNC_INTERVAL_MINUTES,
      });
      console.warn(
        '[BackgroundSync] task registered with interval:',
        BACKGROUND_SYNC_INTERVAL_MINUTES,
      );
    }
    return true;
  } catch (error) {
    console.warn('[BackgroundSync] failed to register task:', error);
    return false;
  }
}

/** Unregister the background sync task. */
export async function unregisterBackgroundSyncTask(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const alreadyRegistered = await isBackgroundSyncRegistered();
    if (alreadyRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.warn('[BackgroundSync] task unregistered');
    }
  } catch (error) {
    console.warn('[BackgroundSync] failed to unregister task:', error);
  }
}

