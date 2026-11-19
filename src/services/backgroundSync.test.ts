import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BACKGROUND_SYNC_TASK,
  getBackgroundSyncAvailability,
  isBackgroundSyncRegistered,
  performBackgroundSync,
  registerBackgroundSyncTask,
  unregisterBackgroundSyncTask,
} from "./backgroundSync";

const mocks = vi.hoisted(() => ({
  backgroundTask: {
    BackgroundTaskStatus: { Restricted: 1, Available: 2 },
    BackgroundTaskResult: { Success: 1, Failed: 2 },
    getStatusAsync: vi.fn(),
    registerTaskAsync: vi.fn(),
    unregisterTaskAsync: vi.fn(),
  },
  taskManager: {
    defineTask: vi.fn(),
    isTaskRegisteredAsync: vi.fn(),
  },
  db: {
    getDb: vi.fn().mockResolvedValue({}),
    getSetting: vi.fn().mockResolvedValue("fr"),
  },
  syncEngine: {
    pull: vi.fn().mockResolvedValue(undefined),
    pushAllPending: vi.fn().mockResolvedValue(undefined),
  },
  notificationService: {
    resyncWindow: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

vi.mock("expo-background-task", () => mocks.backgroundTask);
vi.mock("expo-task-manager", () => mocks.taskManager);
vi.mock("@/db/client", () => mocks.db);
vi.mock("@/services/syncEngine", () => ({ SyncEngine: mocks.syncEngine }));
vi.mock("@/services/notificationService", () => ({
  NotificationService: mocks.notificationService,
}));
vi.mock("@/i18n", () => ({
  isLocalePreference: (val: string) => val === "fr" || val === "en",
  resolveLocale: (val: string) => val,
  setAppLocale: vi.fn().mockResolvedValue(undefined),
}));

describe("backgroundSync service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("performBackgroundSync", () => {
    it("executes pull, pushAllPending, and resyncWindow", async () => {
      const result = await performBackgroundSync();
      expect(result).toBe(true);
      expect(mocks.db.getDb).toHaveBeenCalled();
      expect(mocks.syncEngine.pull).toHaveBeenCalled();
      expect(mocks.syncEngine.pushAllPending).toHaveBeenCalled();
      expect(mocks.notificationService.resyncWindow).toHaveBeenCalled();
    });

    it("returns false and catches errors without throwing", async () => {
      mocks.syncEngine.pull.mockRejectedValueOnce(new Error("Sync failed"));
      const result = await performBackgroundSync();
      expect(result).toBe(false);
    });
  });

  describe("getBackgroundSyncAvailability", () => {
    it("returns available when status is Available", async () => {
      mocks.backgroundTask.getStatusAsync.mockResolvedValueOnce(
        mocks.backgroundTask.BackgroundTaskStatus.Available,
      );
      const status = await getBackgroundSyncAvailability();
      expect(status).toBe("available");
    });

    it("returns restricted when status is Restricted", async () => {
      mocks.backgroundTask.getStatusAsync.mockResolvedValueOnce(
        mocks.backgroundTask.BackgroundTaskStatus.Restricted,
      );
      const status = await getBackgroundSyncAvailability();
      expect(status).toBe("restricted");
    });
  });

  describe("isBackgroundSyncRegistered", () => {
    it("checks task registration with task manager", async () => {
      mocks.taskManager.isTaskRegisteredAsync.mockResolvedValueOnce(true);
      const registered = await isBackgroundSyncRegistered();
      expect(registered).toBe(true);
      expect(mocks.taskManager.isTaskRegisteredAsync).toHaveBeenCalledWith(
        BACKGROUND_SYNC_TASK,
      );
    });
  });

  describe("registerBackgroundSyncTask", () => {
    it("registers task when available and not yet registered", async () => {
      mocks.backgroundTask.getStatusAsync.mockResolvedValueOnce(
        mocks.backgroundTask.BackgroundTaskStatus.Available,
      );
      mocks.taskManager.isTaskRegisteredAsync.mockResolvedValueOnce(false);

      const registered = await registerBackgroundSyncTask();
      expect(registered).toBe(true);
      expect(mocks.backgroundTask.registerTaskAsync).toHaveBeenCalledWith(
        BACKGROUND_SYNC_TASK,
        { minimumInterval: 15 },
      );
    });

    it("does not re-register if already registered", async () => {
      mocks.backgroundTask.getStatusAsync.mockResolvedValueOnce(
        mocks.backgroundTask.BackgroundTaskStatus.Available,
      );
      mocks.taskManager.isTaskRegisteredAsync.mockResolvedValueOnce(true);

      const registered = await registerBackgroundSyncTask();
      expect(registered).toBe(true);
      expect(mocks.backgroundTask.registerTaskAsync).not.toHaveBeenCalled();
    });

    it("does not register if background task is restricted", async () => {
      mocks.backgroundTask.getStatusAsync.mockResolvedValueOnce(
        mocks.backgroundTask.BackgroundTaskStatus.Restricted,
      );

      const registered = await registerBackgroundSyncTask();
      expect(registered).toBe(false);
      expect(mocks.backgroundTask.registerTaskAsync).not.toHaveBeenCalled();
    });
  });

  describe("unregisterBackgroundSyncTask", () => {
    it("unregisters task when registered", async () => {
      mocks.taskManager.isTaskRegisteredAsync.mockResolvedValueOnce(true);

      await unregisterBackgroundSyncTask();
      expect(mocks.backgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(
        BACKGROUND_SYNC_TASK,
      );
    });

    it("does nothing when not registered", async () => {
      mocks.taskManager.isTaskRegisteredAsync.mockResolvedValueOnce(false);

      await unregisterBackgroundSyncTask();
      expect(mocks.backgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();
    });
  });
});
