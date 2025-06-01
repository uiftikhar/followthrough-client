"use client";

import { useState, useEffect } from "react";
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
  useGmailTriage,
  type TriageNotification,
} from "@/hooks/useGmailTriage";
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

  // Configuration state
  const [labelIds, setLabelIds] = useState<string>("");

  // Use Gmail Triage hook for WebSocket functionality
  const {
    isAuthenticated,
    connectionState,
    authStatus,
    notifications: triageNotifications,
    latestNotification,
    setupNotifications: triageSetupNotifications,
    connect,
    disconnect,
    isLoading: triageLoading,
    error: triageError,
  } = useGmailTriage({ autoConnect: false });

  // Derived state
  const notificationsEnabled = status.isEnabled;
  const isConnected = connectionState === "connected";
  const isLoading = triageLoading;

  useEffect(() => {
    loadStatus();
    loadHealth();
    loadStatistics();
  }, []);

  // Auto-connect to WebSocket when notifications are enabled
  useEffect(() => {
    if (notificationsEnabled && isAuthenticated && connectionState === "disconnected") {
      connect().catch(console.error);
    }
  }, [notificationsEnabled, isAuthenticated, connectionState, connect]);

  const loadStatus = async () => {
    try {
      const notificationStatus = await GmailNotificationsService.getStatus();
      setStatus(notificationStatus);
      setError(null);
      onStatusChange?.(notificationStatus);
    } catch (error) {
      console.error("Failed to load Gmail notification status:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
    try {
      setError(null);

      const setupOptions: SetupGmailNotificationsDto = {};
      if (labelIds.trim()) {
        setupOptions.labelIds = labelIds.split(",").map((id) => id.trim());
      }

      // Use the triage hook's setup function which handles WebSocket connection
      await triageSetupNotifications();
      
      // Reload status after setup
      await loadStatus();
      await loadHealth();
    } catch (error) {
      console.error("Failed to setup notifications:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      setError(null);

      // Disconnect WebSocket first
      disconnect();

      const result = await GmailNotificationsService.disableNotifications();

      if (result.success) {
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
    }
  };

  const handleRenewWatch = async () => {
    try {
      setError(null);

      const result = await GmailNotificationsService.renewWatch();

      if (result.success) {
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

      if (result.success) {
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

      if (result.success) {
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
  if (error || triageError) {
    const displayError = error || triageError;
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
            <p className="text-red-800 text-sm">{displayError}</p>
          </div>
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
          <Badge variant="default" className="bg-yellow-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Connecting
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
          <Badge variant="secondary">
            <WifiOff className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  const GoogleAuthCard = () => {
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
          {authStatus?.oauth.userInfo?.googleEmail && (
            <span className="block mt-1 font-medium text-sm">
              Connected: {authStatus.oauth.userInfo.googleEmail}
            </span>
          )}
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
                    disabled={isLoading || !isAuthenticated}
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

                {isConnected && triageNotifications.length > 0 && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Real-time Activity
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      {triageNotifications.length} notifications received
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
                    onClick={connect}
                    disabled={isLoading}
                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    Connect WebSocket
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
                <h4 className="font-medium">Real-time Notifications</h4>
                <Badge variant="outline">
                  {triageNotifications.length} total
                </Badge>
              </div>

              {triageNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2" />
                  <p>No notifications yet.</p>
                  <p className="text-sm">Enable push notifications to see real-time updates!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {triageNotifications.slice(0, 10).map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {notification.type === "started" && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          )}
                          {notification.type === "completed" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {notification.type === "failed" && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm">
                            {notification.emailAddress}
                          </span>
                        </div>
                        <Badge
                          variant={
                            notification.type === "completed"
                              ? "default"
                              : notification.type === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {notification.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        {notification.timestamp.toLocaleString()}
                      </div>
                      {notification.result && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Priority:</strong> {notification.result.classification.priority} |{" "}
                          <strong>Category:</strong> {notification.result.classification.category}
                        </div>
                      )}
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

              {authStatus?.oauth?.userInfo && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="font-medium text-sm text-green-800 mb-2">
                    Connected Account
                  </h4>
                  <div className="flex items-center gap-3">
                    {authStatus.oauth.userInfo.googlePicture && (
                      <img
                        src={authStatus.oauth.userInfo.googlePicture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {authStatus.oauth.userInfo.googleName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {authStatus.oauth.userInfo.googleEmail}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
