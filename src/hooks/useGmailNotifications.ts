import { useState, useEffect, useCallback } from "react";
import {
  GmailNotificationsService,
  type NotificationStatus,
  type SetupNotificationsResponse,
  type DisableNotificationsResponse,
  type WatchInfo,
} from "@/lib/api/gmail-notifications-service";
import {
  GmailHealthService,
  type SystemHealthResponse,
  type StatisticsResponse,
} from "@/lib/api/gmail-health-service";

interface UseGmailNotificationsReturn {
  status: NotificationStatus;
  health: SystemHealthResponse | null;
  statistics: StatisticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setupNotifications: (options?: any) => Promise<boolean>;
  disableNotifications: () => Promise<boolean>;
  renewWatch: () => Promise<boolean>;
  testPubSub: () => Promise<any>;
  processPullMessages: () => Promise<any>;
}

export function useGmailNotifications(
  autoRefreshInterval?: number, // in milliseconds
): UseGmailNotificationsReturn {
  const [status, setStatus] = useState<NotificationStatus>({
    isEnabled: false,
  });
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await GmailNotificationsService.getStatus();
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const newHealth = await GmailHealthService.getSystemHealth();
      setHealth(newHealth);
    } catch (err) {
      console.error("Failed to refresh health:", err);
    }
  }, []);

  const refreshStatistics = useCallback(async () => {
    try {
      const newStats = await GmailHealthService.getStatistics();
      setStatistics(newStats);
    } catch (err) {
      console.error("Failed to refresh statistics:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshStatus(),
        refreshHealth(),
        refreshStatistics(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, refreshHealth, refreshStatistics]);

  const setupNotifications = useCallback(
    async (options?: any): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const result =
          await GmailNotificationsService.setupNotifications(options);

        if (result.success) {
          await refreshStatus();
          await refreshHealth();
          return true;
        } else {
          throw new Error(
            result.error || result.message || "Failed to setup notifications",
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStatus, refreshHealth],
  );

  const disableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.disableNotifications();

      if (result.success) {
        await refreshStatus();
        await refreshHealth();
        return true;
      } else {
        throw new Error(result.message || "Failed to disable notifications");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, refreshHealth]);

  const renewWatch = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.renewWatch();

      if (result.success) {
        await refreshStatus();
        await refreshHealth();
        return true;
      } else {
        throw new Error(
          result.error || result.message || "Failed to renew watch",
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, refreshHealth]);

  const testPubSub = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.testPubSub();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processPullMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.processPendingMessages();

      if (result.success) {
        await refreshStatistics();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatistics]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh if interval is provided
  useEffect(() => {
    if (autoRefreshInterval && autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        refreshAll();
      }, autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval, refreshAll]);

  return {
    status,
    health,
    statistics,
    isLoading,
    error,
    refreshStatus,
    refreshHealth,
    refreshStatistics,
    refreshAll,
    setupNotifications,
    disableNotifications,
    renewWatch,
    testPubSub,
    processPullMessages,
  };
}
