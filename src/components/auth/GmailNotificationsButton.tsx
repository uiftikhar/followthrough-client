"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GmailNotificationsService,
  type NotificationStatus,
  type SetupGmailNotificationsDto,
  type SetupNotificationsResponse,
  type WatchInfo,
} from "@/lib/api/gmail-notifications-service";
import {
  GmailHealthService,
  type SystemHealthResponse,
  type StatisticsResponse,
} from "@/lib/api/gmail-health-service";
import {
  GmailAuthService,
  type OAuthStatus,
} from "@/lib/api/gmail-auth-service";
import {
  getWebSocketClient,
  type WebSocketClient,
  type ConnectionState,
} from "@/lib/api/websocket-client";
import {
  Bell,
  BellOff,
  Mail,
  RefreshCw,
  TestTube,
  Activity,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Play,
  Pause,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { HttpClient } from "@/lib/api/http-client";

interface GmailNotificationsButtonProps {
  onStatusChange?: (status: NotificationStatus) => void;
  onError?: (error: string) => void;
}

/**
 * Email notification from WebSocket
 */
interface EmailNotification {
  id: string;
  type: string;
  emailId: string;
  emailAddress: string;
  summary: string;
  timestamp: Date;
}

export function GmailNotificationsButton({
  onStatusChange,
  onError,
}: GmailNotificationsButtonProps) {
  const [activeTab, setActiveTab] = useState("control");
  const [status, setStatus] = useState<NotificationStatus>({
    isEnabled: false,
  });
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupEmailNotifications, onSetSetupEmailNotifications] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // WebSocket state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [latestNotification, setLatestNotification] = useState<EmailNotification | null>(null);

  // Configuration state
  const [labelIds, setLabelIds] = useState<string>("");

  // Refs
  const wsClientRef = useRef<WebSocketClient | null>(null);

  // Derived state
  const notificationsEnabled = status ? status.isEnabled : false;
  const isConnected = connectionState === "connected";
  const isAuthenticated = GmailAuthService.isAuthenticated();

  // Remove automatic loading on mount - only load when user explicitly interacts
  // useEffect(() => {
  //   loadStatus();
  //   loadHealth();
  //   loadStatistics();
  // }, []);

  // Remove auto-connect to WebSocket - only connect when user explicitly sets up notifications
  // useEffect(() => {
  //   if (notificationsEnabled && isAuthenticated && connectionState === "disconnected") {
  //     connectWebSocket().catch(console.error);
  //   }
  // }, [notificationsEnabled, isAuthenticated, connectionState]);

  const setupWebSocketListeners = useCallback((client: WebSocketClient) => {
    // Connection events
    client.on("connected", () => {
      setConnectionState("connected");
      setError(null);
      console.log("✅ WebSocket connected");
    });

    client.on("disconnected", () => {
      setConnectionState("disconnected");
      console.log("❌ WebSocket disconnected");
    });

    client.on("error", (data: { error: string }) => {
      setConnectionState("error");
      setError(`WebSocket error: ${data.error}`);
      console.error("WebSocket error:", data.error);
    });

    // Email notification events
    client.on("notification", (data: any) => {
      console.log("📧 Notification received:", data);
      
      if (data.type === "email_received") {
        const notification: EmailNotification = {
          id: `email-${data.emailId}-${Date.now()}`,
          type: data.type,
          emailId: data.emailId,
          emailAddress: data.emailAddress,
          summary: data.summary,
          timestamp: new Date(data.timestamp),
        };

        setNotifications((prev) => [notification, ...prev]);
        setLatestNotification(notification);
        console.log("📬 Email notification added:", notification);
      }
    });

    client.on("max_reconnect_reached", () => {
      setError("Maximum reconnection attempts reached");
      console.error("Max reconnection attempts reached");
    });
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error("User must be authenticated to connect");
    }

    try {
      setIsLoading(true);
      setError(null);
      setConnectionState("connecting");

      const client = getWebSocketClient({
        debug: true,
        maxReconnectAttempts: 5,
        reconnectInterval: 3000,
      });

      // Make sure the WebSocket client has the current JWT token
      const token = GmailAuthService.getToken();
      if (token) {
        client.setToken(token);
      }

      setupWebSocketListeners(client);

      await client.connect();

      // Subscribe to notifications
      const userIdFromToken = GmailAuthService.getUserIdFromToken();
      if (userIdFromToken) {
        client.subscribe({
          userId: userIdFromToken,
        });
      }

      wsClientRef.current = client;
      console.log("🔌 WebSocket connected successfully");
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setConnectionState("error");
      
      // Provide more user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("timeout") || errorMessage.includes("unavailable")) {
        setError("Unable to connect to server. Please check if the server is running and try again.");
      } else {
        setError(`WebSocket connection failed: ${errorMessage}`);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setupWebSocketListeners]);

  const disconnectWebSocket = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
    setConnectionState("disconnected");
  }, []);

  const loadStatus = async () => {
    try {
      const notificationStatus = await GmailNotificationsService.getStatus();
      console.log("********************* LOAD STATUS *********************", notificationStatus);
      
      // Check if response is valid before using it
      if (notificationStatus && typeof notificationStatus === 'object') {
        setStatus(notificationStatus);
        setError(null);
        onStatusChange?.(notificationStatus);
      } else {
        console.warn("Invalid notification status response:", notificationStatus);
        setError("Invalid response from notification service");
        onError?.("Invalid response from notification service");
      }
    } catch (error) {
      console.error("Failed to load Gmail notification status:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const loadHealth = async () => {
    try {
      const healthStatus = await GmailHealthService.getSystemHealth();
      setHealth(healthStatus);
    } catch (error) {
      console.error("Failed to load Gmail health:", error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await GmailHealthService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to load Gmail statistics:", error);
    }
  };

  const handleSetupNotifications = async () => {
    if (isSetupLoading) return; // Prevent multiple calls
    
    setIsSetupLoading(true);
    try {
      setError(null);
      setIsInitialized(true); // Mark as initialized when user sets up notifications

      const setupOptions: SetupGmailNotificationsDto = {};
      if (labelIds.trim()) {
        setupOptions.labelIds = labelIds.split(",").map((id) => id.trim());
      }

      const result = await GmailNotificationsService.setupNotifications(setupOptions);

      console.log("********************* SETUP NOTIFICATIONS *********************", result);
      if (result?.success) {
        await loadStatus();
        await loadHealth();
        
        // Connect WebSocket after successful setup
        if (isAuthenticated) {
          await connectWebSocket();
        }
      } else {
        throw new Error(result.error || result.message || "Failed to setup notifications");
      }
    } catch (error) {
      console.error("Failed to setup notifications:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSetupLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (isSetupLoading) return; // Prevent multiple calls
    
    setIsSetupLoading(true);
    try {
      setError(null);
      setIsInitialized(true); // Mark as initialized when user disables notifications

      // Disconnect WebSocket first
      disconnectWebSocket();

      const result = await GmailNotificationsService.disableNotifications();

      if (result?.success) {
        await loadStatus();
        await loadHealth();
      } else {
        throw new Error(result.message || "Failed to disable notifications");
      }
    } catch (error) {
      console.error("Failed to disable notifications:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSetupLoading(false);
    }
  };

  const handleRenewWatch = async () => {
    try {
      setError(null);

      const result = await GmailNotificationsService.renewWatch();

      if (result?.success) {
        await loadStatus();
        await loadHealth();
      } else {
        throw new Error(
          result.error || result.message || "Failed to renew watch",
        );
      }
    } catch (error) {
      console.error("Failed to renew watch:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleTestPubSub = async () => {
    try {
      setError(null);

      const result = await GmailNotificationsService.testPubSub();

      if (result?.success) {
        alert(`Pub/Sub Test Success!\n\n${result.message}`);
      } else {
        throw new Error(result.message || "Pub/Sub test failed");
      }
    } catch (error) {
      console.error("Failed to test Pub/Sub:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleProcessPullMessages = async () => {
    try {
      setError(null);

      const result = await GmailNotificationsService.processPendingMessages();

      if (result?.success) {
        alert(
          `Pull Messages Processing Complete!\n\nProcessed: ${result.processed || 0} messages\n${result.message}`,
        );
        await loadStatistics();
      } else {
        throw new Error(result.message || "Failed to process pull messages");
      }
    } catch (error) {
      console.error("Failed to process pull messages:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleSetupEmailNotifications = async () => {
    try {
      const setupEmailNotifications = await HttpClient.post(
        "/oauth/google/setup-email-notifications"
      );

      const setupEmailNotificationsData = await HttpClient.parseJsonResponse<{
        success: boolean;
        message: string;
        watchInfo: WatchInfo
      }>(setupEmailNotifications);
      console.log(
        "********************* SETUP EMAIL NOTIFICATIONS *********************",
        setupEmailNotificationsData.message, setupEmailNotificationsData.watchInfo,
      );
      onSetSetupEmailNotifications(true);
    } catch (error) {
      console.error("Failed to setup email notifications:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
    }
  };

  const refreshAll = async () => {
    try {
      setIsInitialized(true); // Mark as initialized when user explicitly refreshes
      await Promise.all([
        loadStatus(),
        loadHealth(),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error("Failed to refresh:", error);
    }
  };

  // Show error state
  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg text-red-800">
              Gmail Notifications Error
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          {error.includes("server") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Server Check</span>
              </div>
              <p className="text-blue-800 text-xs">
                Make sure your server is running at: wss://followthrough-server-production.up.railway.app
              </p>
              <p className="text-blue-800 text-xs mt-1">
                The WebSocket server should be available on the same ngrok URL as your API.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                loadStatus();
              }}
              disabled={isLoading}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConnectionBadge = () => {
    switch (connectionState) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500">
            <Wifi className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "connecting":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Connecting...
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <WifiOff className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <WifiOff className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  const GoogleAuthCard = () => {
    // Show initial state when component hasn't been initialized
    if (!isInitialized && !notificationsEnabled) {
      return (
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellOff className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg">Gmail Push Notifications</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Loading..." : "Check Status"}
              </Button>
            </div>
            <CardDescription>
              Click "Check Status" to load current notification settings, or toggle notifications to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">
                Gmail push notifications are not configured yet
              </p>
              <div className="flex items-center justify-center gap-2">
                <Checkbox
                  checked={false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleSetupNotifications();
                    }
                  }}
                  disabled={isSetupLoading || !isAuthenticated}
                />
                <span className="text-sm">
                  {isSetupLoading ? "Setting up notifications..." : "Enable Gmail Push Notifications"}
                </span>
              </div>
              {!isAuthenticated && (
                <p className="text-sm text-gray-500 mt-2">
                  Please authenticate with Google first
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notificationsEnabled ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-600" />
            )}
            <CardTitle className="text-lg">Gmail Push Notifications</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {notificationsEnabled && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Active
              </Badge>
            )}
            {getConnectionBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time email notifications via Google Pub/Sub with WebSocket
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="notifications">Live Feed</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Push Notifications</span>
                    {isSetupLoading && (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  <Checkbox
                    checked={notificationsEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSetupNotifications();
                      } else {
                        handleDisableNotifications();
                      }
                    }}
                    disabled={isSetupLoading || isLoading || !isAuthenticated}
                  />
                </div>

                {status.watchInfo?.expiresAt && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Watch Expires
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      {new Date(status.watchInfo.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {isConnected && notifications.length > 0 && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Real-time Activity
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      {notifications.length} email notifications received
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleRenewWatch}
                  disabled={isLoading || !notificationsEnabled}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isLoading ? "Renewing..." : "Renew Watch"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestPubSub}
                  disabled={isLoading}
                  className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {isLoading ? "Testing..." : "Test Pub/Sub"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleProcessPullMessages}
                  disabled={isLoading}
                  className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isLoading ? "Processing..." : "Process Pull Messages"}
                </Button>

                {notificationsEnabled && !isConnected && (
                  <Button
                    variant="outline"
                    onClick={connectWebSocket}
                    disabled={isLoading || connectionState === "connecting"}
                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    {connectionState === "connecting" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wifi className="h-4 w-4 mr-2" />
                        Connect WebSocket
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            {health ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {health.status === "healthy" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    System{" "}
                    {health.status === "healthy" ? "Healthy" : "Unhealthy"}
                  </span>
                  <Badge
                    variant={
                      health.status === "healthy" ? "default" : "destructive"
                    }
                  >
                    {health.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Watch Status</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Total Active:</span>
                        <span
                          className={
                            health.watches.totalActive > 0
                              ? "text-green-600"
                              : "text-gray-600"
                          }
                        >
                          {health.watches.totalActive}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expiring Soon:</span>
                        <span
                          className={
                            health.watches.expiringSoon > 0
                              ? "text-yellow-600"
                              : "text-gray-600"
                          }
                        >
                          {health.watches.expiringSoon}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>With Errors:</span>
                        <span
                          className={
                            health.watches.withErrors > 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }
                        >
                          {health.watches.withErrors}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Notifications:</span>
                        <span>{health.watches.totalNotifications}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emails Processed:</span>
                        <span>{health.watches.totalEmailsProcessed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Pub/Sub Status</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Connected:</span>
                        <span
                          className={
                            health.pubsub.connected ? "text-green-600" : "text-red-600"
                          }
                        >
                          {health.pubsub.connected ? "Yes" : "No"}
                        </span>
                      </div>
                      {Object.entries(health.pubsub.subscriptions).map(([name, sub], index) => (
                        <div key={index} className="flex justify-between">
                          <span>{name}:</span>
                          <span
                            className={
                              sub.exists ? "text-green-600" : "text-red-600"
                            }
                          >
                            {sub.exists ? "Healthy" : "Unhealthy"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-600">
                    Last checked: {new Date(health.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p>Loading health status...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {statistics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg border text-center">
                    <Activity className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <div className="text-lg font-bold">
                      {statistics.watches.totalActive}
                    </div>
                    <div className="text-xs text-gray-500">Active Watches</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Clock className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
                    <div className="text-lg font-bold">
                      {statistics.watches.expiringSoon}
                    </div>
                    <div className="text-xs text-gray-500">Expiring Soon</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Bell className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                    <div className="text-lg font-bold">
                      {statistics.watches.totalNotifications}
                    </div>
                    <div className="text-xs text-gray-500">Notifications</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Mail className="h-6 w-6 mx-auto mb-1 text-green-600" />
                    <div className="text-lg font-bold">
                      {statistics.watches.totalEmailsProcessed}
                    </div>
                    <div className="text-xs text-gray-500">
                      Emails Processed
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Watch Health</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>With Errors:</span>
                        <span
                          className={
                            statistics.watches.withErrors > 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }
                        >
                          {statistics.watches.withErrors}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Pub/Sub Health</h4>
                    <div className="space-y-1 text-xs">
                      {Object.entries(statistics.pubsub?.subscriptions || {}).map(([name, sub], index) => (
                        <div key={index} className="flex justify-between">
                          <span>{name}:</span>
                          <span
                            className={
                              sub.exists ? "text-green-600" : "text-red-600"
                            }
                          >
                            {sub.exists ? "OK" : "Error"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-600">
                    Last updated:{" "}
                    {new Date(statistics.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                <p>Loading statistics...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Real-time Email Notifications</h4>
                <Badge variant="outline">
                  {notifications.length} total
                </Badge>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-8 w-8 mx-auto mb-2" />
                  <p>No email notifications yet.</p>
                  <p className="text-sm">Enable push notifications to see real-time email updates!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.slice(0, 20).map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">
                            {notification.emailAddress}
                          </span>
                        </div>
                        <Badge variant="default" className="bg-blue-500">
                          {notification.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        {notification.summary}
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Email ID: {notification.emailId}</span>
                        <span>{notification.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labelIds">Label IDs (comma-separated)</Label>
                <Input
                  id="labelIds"
                  placeholder="INBOX,IMPORTANT"
                  value={labelIds}
                  onChange={(e) => setLabelIds(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Specify Gmail labels to watch. Leave empty for all emails.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-medium text-sm text-blue-800 mb-2">
                  WebSocket Connection
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status: {connectionState}</span>
                  {getConnectionBadge()}
                </div>
                {isConnected && (
                  <div className="text-xs text-gray-600 mt-1">
                    Listening for email_received notifications
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>   
    )
  }

  if(setupEmailNotifications) {
    return <GoogleAuthCard />
  }

  return  (
    <Button
      variant="outline"
      onClick={handleSetupEmailNotifications}
      className="w-full"
    >
      Setup Email Notifications
    </Button>
  )
}
