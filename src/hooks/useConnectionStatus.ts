import { useState, useEffect } from "react";
import {
  GmailHealthService,
  type SystemHealthResponse,
} from "../lib/api/gmail-health-service";

/**
 * Connection status for the Gmail system
 */
export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "degraded"
  | "loading";

/**
 * Options for the useConnectionStatus hook
 */
interface UseConnectionStatusOptions {
  /**
   * Polling interval in milliseconds
   */
  pollingInterval?: number;

  /**
   * Whether to poll immediately on mount
   */
  pollImmediately?: boolean;
}

/**
 * Hook for monitoring Gmail system connection status
 */
export function useConnectionStatus(options: UseConnectionStatusOptions = {}): {
  status: ConnectionStatus;
  lastChecked: Date | null;
  checkNow: () => Promise<void>;
  details: SystemHealthResponse | null;
} {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [details, setDetails] = useState<SystemHealthResponse | null>(null);

  const pollingInterval = options.pollingInterval || 30000; // Default: 30 seconds
  const pollImmediately = options.pollImmediately !== false; // Default: true

  // Function to check connection status
  const checkConnection = async (): Promise<void> => {
    try {
      const healthStatus = await GmailHealthService.getSystemHealth();

      setLastChecked(new Date());
      setDetails(healthStatus);

      if (healthStatus.status === "healthy") {
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    } catch (error) {
      console.error("Failed to check Gmail system status:", error);
      setStatus("disconnected");
      setLastChecked(new Date());
    }
  };

  // Set up polling
  useEffect(() => {
    if (pollImmediately) {
      checkConnection();
    }

    const intervalId = setInterval(checkConnection, pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [pollingInterval, pollImmediately]);

  return {
    status,
    lastChecked,
    checkNow: checkConnection,
    details,
  };
}
