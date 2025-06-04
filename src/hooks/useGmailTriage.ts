/**
 * React Hook for Gmail Email Triage Integration
 *
 * Provides a complete interface for Gmail triage functionality including:
 * - Real-time WebSocket notifications
 * - HTTP API integration
 * - Authentication management
 * - Connection state management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  GmailAuthService,
  type OAuthStatus,
} from "../lib/api/gmail-auth-service";
import { GmailNotificationsService } from "../lib/api/gmail-notifications-service";
import {
  GmailTriageService,
  type EmailTriageResult,
} from "../lib/api/gmail-triage-service";
import {
  GmailHealthService,
  type SystemHealthResponse,
} from "../lib/api/gmail-health-service";
import {
  getWebSocketClient,
  type WebSocketClient,
  type TriageStartedEvent,
  type TriageCompletedEvent,
  type TriageFailedEvent,
  type ConnectionState,
} from "../lib/api/websocket-client";

/**
 * Combined auth status response
 */
export interface AuthStatusResponse {
  success: boolean;
  oauth: OAuthStatus;
  notifications: {
    isEnabled: boolean;
    watchInfo?: any;
  };
  system: SystemHealthResponse;
  nextSteps: string[];
}

/**
 * Triage notification data
 */
export interface TriageNotification {
  id: string;
  type: "started" | "completed" | "failed";
  sessionId: string;
  emailId: string;
  emailAddress: string;
  timestamp: Date;
  result?: EmailTriageResult;
  error?: string;
}

/**
 * Hook configuration
 */
export interface UseGmailTriageConfig {
  /**
   * Auto-connect to WebSocket on mount
   */
  autoConnect?: boolean;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * WebSocket reconnection settings
   */
  websocket?: {
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
  };
}

/**
 * Hook return type
 */
export interface UseGmailTriageReturn {
  // Connection state
  isAuthenticated: boolean;
  connectionState: ConnectionState;
  authStatus: AuthStatusResponse | null;

  // Operations
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setupNotifications: () => Promise<void>;
  testEmailTriage: (
    subject: string,
    from: string,
    body: string,
  ) => Promise<string>;
  getTriageResult: (sessionId: string) => Promise<EmailTriageResult | null>;

  // Real-time data
  notifications: TriageNotification[];
  latestNotification: TriageNotification | null;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;

  // State
  isLoading: boolean;
  error: string | null;

  // System info
  systemHealth: {
    status: "healthy" | "unhealthy" | "unknown";
    lastChecked: Date | null;
  };
}

/**
 * Gmail Triage Hook
 */
export function useGmailTriage(
  config: UseGmailTriageConfig = {},
): UseGmailTriageReturn {
  // Configuration
  const { autoConnect = true, debug = false, websocket = {} } = config;

  // State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [notifications, setNotifications] = useState<TriageNotification[]>([]);
  const [latestNotification, setLatestNotification] =
    useState<TriageNotification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<{
    status: "healthy" | "unhealthy" | "unknown";
    lastChecked: Date | null;
  }>({
    status: "unknown",
    lastChecked: null,
  });

  // Refs
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const userIdRef = useRef<string | null>(null);
  const userEmailRef = useRef<string | null>(null);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      const authenticated = GmailAuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        userIdRef.current = GmailAuthService.getUserIdFromToken();

        // Get auth status components
        const [oauthStatus, notificationStatus, healthStatus] =
          await Promise.all([
            GmailAuthService.getOAuthStatus(),
            GmailNotificationsService.getStatus(),
            GmailHealthService.getSystemHealth(),
          ]);

        // Combine into unified auth status
        const combinedStatus: AuthStatusResponse = {
          success: oauthStatus.success,
          oauth: oauthStatus.oauth,
          notifications: {
            isEnabled: notificationStatus.isEnabled,
            watchInfo: notificationStatus.watchInfo,
          },
          system: healthStatus,
          nextSteps: oauthStatus.nextSteps,
        };

        setAuthStatus(combinedStatus);

        if (oauthStatus.oauth.userInfo) {
          userEmailRef.current = oauthStatus.oauth.userInfo.googleEmail;
        }
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      setError("Failed to initialize authentication");
    }
  }, []);

  /**
   * Setup WebSocket event listeners
   */
  const setupWebSocketListeners = useCallback(
    (client: WebSocketClient) => {
      // Connection events
      client.on("connected", () => {
        setConnectionState("connected");
        setError(null);
        if (debug) console.log("✅ WebSocket connected");
      });

      client.on("disconnected", () => {
        setConnectionState("disconnected");
        if (debug) console.log("❌ WebSocket disconnected");
      });

      client.on("error", (data: { error: string }) => {
        setConnectionState("error");
        setError(`WebSocket error: ${data.error}`);
        if (debug) console.error("WebSocket error:", data.error);
      });

      // Triage events
      client.on("triage.started", (data: TriageStartedEvent) => {
        const notification: TriageNotification = {
          id: `started-${data.sessionId}`,
          type: "started",
          sessionId: data.sessionId,
          emailId: data.emailId,
          emailAddress: data.emailAddress,
          timestamp: new Date(data.timestamp),
        };

        setNotifications((prev) => [notification, ...prev]);
        setLatestNotification(notification);

        if (debug) console.log("🚀 Triage started:", data);
      });

      client.on("triage.completed", (data: TriageCompletedEvent) => {
        const notification: TriageNotification = {
          id: `completed-${data.sessionId}`,
          type: "completed",
          sessionId: data.sessionId,
          emailId: data.emailId,
          emailAddress: data.emailAddress,
          timestamp: new Date(data.timestamp),
          result: data.result,
        };

        setNotifications((prev) => [notification, ...prev]);
        setLatestNotification(notification);

        if (debug) console.log("✅ Triage completed:", data);
      });

      client.on("triage.failed", (data: TriageFailedEvent) => {
        const notification: TriageNotification = {
          id: `failed-${data.emailId}-${Date.now()}`,
          type: "failed",
          sessionId: "",
          emailId: data.emailId,
          emailAddress: data.emailAddress,
          timestamp: new Date(data.timestamp),
          error: data.error,
        };

        setNotifications((prev) => [notification, ...prev]);
        setLatestNotification(notification);

        if (debug) console.log("❌ Triage failed:", data);
      });

      client.on("max_reconnect_reached", () => {
        setError("Maximum reconnection attempts reached");
        if (debug) console.error("Max reconnection attempts reached");
      });
    },
    [debug],
  );

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    const authStatus = GmailAuthService.isAuthenticated();
    console.log("Auth status:", authStatus);
    if (!authStatus || !userIdRef.current) {
      throw new Error("User must be authenticated to connect");
    }

    try {
      setIsLoading(true);
      setError(null);
      setConnectionState("connecting");

      const client = getWebSocketClient({
        debug,
        maxReconnectAttempts: websocket.maxReconnectAttempts,
        reconnectInterval: websocket.reconnectInterval,
      });

      // Make sure the WebSocket client has the current JWT token
      const token = GmailAuthService.getToken();
      if (token) {
        client.setToken(token);
      }

      setupWebSocketListeners(client);

      await client.connect();

      // Subscribe to notifications
      client.subscribe({
        userId: userIdRef.current,
        emailAddress: userEmailRef.current || undefined,
      });

      wsClientRef.current = client;
    } catch (error) {
      setConnectionState("error");
      setError(error instanceof Error ? error.message : "Failed to connect");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    debug,
    websocket.maxReconnectAttempts,
    websocket.reconnectInterval,
    setupWebSocketListeners,
  ]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
    setConnectionState("disconnected");
  }, []);

  /**
   * Login
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await GmailAuthService.login({ email, password });

        if (!response.success || !response.token) {
          throw new Error(response.error || "Login failed");
        }

        GmailAuthService.setAuthToken(response.token);
        setIsAuthenticated(true);

        // Get user info
        await initializeAuth();

        if (debug) console.log("✅ Login successful");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        setError(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [debug, initializeAuth],
  );

  /**
   * Logout
   */
  const logout = useCallback(() => {
    disconnect();
    GmailAuthService.clearAuthToken();
    setIsAuthenticated(false);
    setAuthStatus(null);
    setNotifications([]);
    setLatestNotification(null);
    setError(null);
    userIdRef.current = null;
    userEmailRef.current = null;

    if (debug) console.log("👋 Logged out");
  }, [disconnect, debug]);

  /**
   * Setup Gmail notifications
   */
  const setupNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await GmailNotificationsService.setupNotifications();

      if (!response.success) {
        throw new Error(response.error || "Failed to setup notifications");
      }

      // Refresh auth status
      await initializeAuth();

      if (debug) console.log("✅ Notifications setup successful");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to setup notifications";
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [debug, initializeAuth]);

  /**
   * Test email triage
   */
  const testEmailTriage = useCallback(
    async (subject: string, from: string, body: string): Promise<string> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await GmailTriageService.testEmailTriage({
          subject,
          from,
          body,
        });

        if (!response.success || !response.sessionId) {
          throw new Error(response.error || "Failed to start triage");
        }

        if (debug) console.log("🧪 Test triage started:", response.sessionId);
        return response.sessionId;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to test triage";
        setError(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [debug],
  );

  /**
   * Get triage result
   */
  const getTriageResult = useCallback(
    async (sessionId: string): Promise<EmailTriageResult | null> => {
      try {
        const response = await GmailTriageService.getTriageResult(sessionId);

        if (!response.success) {
          throw new Error(response.error || "Failed to get triage result");
        }

        return response.result || null;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to get triage result";
        setError(message);
        throw error;
      }
    },
    [],
  );

  /**
   * Check system health
   */
  const checkSystemHealth = useCallback(async () => {
    try {
      const health = await GmailHealthService.getSystemHealth();
      setSystemHealth({
        status: health.status,
        lastChecked: new Date(),
      });
    } catch (error) {
      setSystemHealth({
        status: "unhealthy",
        lastChecked: new Date(),
      });
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
    checkSystemHealth();
  }, [initializeAuth, checkSystemHealth]);

  // Auto-connect if enabled and authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && connectionState === "disconnected") {
      connect().catch((error) => {
        console.error("Auto-connect failed:", error);
      });
    }
  }, [autoConnect, isAuthenticated, connectionState, connect]);

  // Health check interval
  useEffect(() => {
    const interval = setInterval(checkSystemHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkSystemHealth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isAuthenticated,
    connectionState,
    authStatus,

    // Operations
    login,
    logout,
    setupNotifications,
    testEmailTriage,
    getTriageResult,

    // Real-time data
    notifications,
    latestNotification,

    // Connection management
    connect,
    disconnect,

    // State
    isLoading,
    error,

    // System info
    systemHealth,
  };
}
