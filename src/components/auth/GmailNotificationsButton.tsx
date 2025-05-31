"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  GmailNotificationsService, 
  GmailNotificationStatus, 
  GmailHealthStatus, 
  GmailStatistics,
  GmailNotificationSetup 
} from "@/lib/api/gmail-notifications-service";
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
  Pause
} from "lucide-react";

interface GmailNotificationsButtonProps {
  onStatusChange?: (status: GmailNotificationStatus) => void;
  onError?: (error: string) => void;
}

export function GmailNotificationsButton({
  onStatusChange,
  onError,
}: GmailNotificationsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("control");
  const [status, setStatus] = useState<GmailNotificationStatus>({
    success: false,
    isConnected: false
  });
  const [health, setHealth] = useState<GmailHealthStatus | null>(null);
  const [statistics, setStatistics] = useState<GmailStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration state
  const [labelIds, setLabelIds] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");

  // Derived state - determine if notifications are enabled based on watches
  const notificationsEnabled = health?.watches?.totalActive ? health.watches.totalActive > 0 : false;

  useEffect(() => {
    loadStatus();
    loadHealth();
    loadStatistics();
  }, []);

  const loadStatus = async () => {
    try {
      const notificationStatus = await GmailNotificationsService.getStatus();
      setStatus(notificationStatus);
      setError(null);
      onStatusChange?.(notificationStatus);
    } catch (error) {
      console.error('Failed to load Gmail notification status:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const loadHealth = async () => {
    try {
      const healthStatus = await GmailNotificationsService.getHealth();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Failed to load Gmail health:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await GmailNotificationsService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load Gmail statistics:', error);
    }
  };

  const handleSetupNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const setupOptions: GmailNotificationSetup = {};
      if (labelIds.trim()) {
        setupOptions.labelIds = labelIds.split(',').map(id => id.trim());
      }
      if (topicName.trim()) {
        setupOptions.topicName = topicName.trim();
      }

      const result = await GmailNotificationsService.setupNotifications(setupOptions);
      
      if (result.success) {
        await loadStatus();
        await loadHealth();
      } else {
        throw new Error(result.message || 'Failed to setup notifications');
      }
    } catch (error) {
      console.error('Failed to setup notifications:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.disableNotifications();
      
      if (result.success) {
        await loadStatus();
        await loadHealth();
      } else {
        throw new Error(result.message || 'Failed to disable notifications');
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenewWatch = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.renewWatch();
      
      if (result.success) {
        await loadStatus();
        await loadHealth();
      } else {
        throw new Error(result.message || 'Failed to renew watch');
      }
    } catch (error) {
      console.error('Failed to renew watch:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestTriage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.testTriage();
      
      if (result.success) {
        alert(`Email Triage Test Success!\n\nProcessed: ${result.processedEmails || 0} emails\n${result.message}`);
        await loadStatistics();
      } else {
        throw new Error(result.message || 'Triage test failed');
      }
    } catch (error) {
      console.error('Failed to test triage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPubSub = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.testPubSub();
      
      if (result.success) {
        alert(`Pub/Sub Test Success!\n\n${result.message}`);
      } else {
        throw new Error(result.message || 'Pub/Sub test failed');
      }
    } catch (error) {
      console.error('Failed to test Pub/Sub:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPullMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GmailNotificationsService.processPullMessages();
      
      if (result.success) {
        alert(`Pull Messages Processing Complete!\n\nProcessed: ${result.messagesProcessed || 0} messages\n${result.message}`);
        await loadStatistics();
      } else {
        throw new Error(result.message || 'Failed to process pull messages');
      }
    } catch (error) {
      console.error('Failed to process pull messages:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStatus(),
        loadHealth(),
        loadStatistics()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show error state
  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg text-red-800">Gmail Notifications Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
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
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time email notifications via Google Pub/Sub
          {status.googleEmail && (
            <span className="block mt-1 font-medium text-sm">
              Connected: {status.googleEmail}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
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
                    // disabled={isLoading || !status.isConnected}
                  />
                </div>

                {status.expiresAt && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Token Expires</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      {new Date(status.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {status.needsRefresh && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">Token Refresh Needed</span>
                    </div>
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
                  onClick={handleTestTriage}
                  disabled={isLoading}
                  className="w-full text-green-600 border-green-200 hover:bg-green-50"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isLoading ? "Testing..." : "Test Email Triage"}
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            {health ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {health.status === 'healthy' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    System {health.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                  </span>
                  <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                    {health.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Watch Status</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Total Active:</span>
                        <span className={health.watches.totalActive > 0 ? 'text-green-600' : 'text-gray-600'}>
                          {health.watches.totalActive}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expiring Soon:</span>
                        <span className={health.watches.expiringSoon > 0 ? 'text-yellow-600' : 'text-gray-600'}>
                          {health.watches.expiringSoon}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>With Errors:</span>
                        <span className={health.watches.withErrors > 0 ? 'text-red-600' : 'text-gray-600'}>
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
                        <span className={health.pubsub.connected ? 'text-green-600' : 'text-red-600'}>
                          {health.pubsub.connected ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Push Subscription:</span>
                        <span className={health.pubsub.subscriptions.pushSubscription.exists ? 'text-green-600' : 'text-red-600'}>
                          {health.pubsub.subscriptions.pushSubscription.exists ? 'Exists' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pull Subscription:</span>
                        <span className={health.pubsub.subscriptions.pullSubscription.exists ? 'text-green-600' : 'text-red-600'}>
                          {health.pubsub.subscriptions.pullSubscription.exists ? 'Exists' : 'Missing'}
                        </span>
                      </div>
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
                    <div className="text-lg font-bold">{statistics.watches.totalActive}</div>
                    <div className="text-xs text-gray-500">Active Watches</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Clock className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
                    <div className="text-lg font-bold">{statistics.watches.expiringSoon}</div>
                    <div className="text-xs text-gray-500">Expiring Soon</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Bell className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                    <div className="text-lg font-bold">{statistics.watches.totalNotifications}</div>
                    <div className="text-xs text-gray-500">Notifications</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <Mail className="h-6 w-6 mx-auto mb-1 text-green-600" />
                    <div className="text-lg font-bold">{statistics.watches.totalEmailsProcessed}</div>
                    <div className="text-xs text-gray-500">Emails Processed</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Watch Health</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>With Errors:</span>
                        <span className={statistics.watches.withErrors > 0 ? 'text-red-600' : 'text-gray-600'}>
                          {statistics.watches.withErrors}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Pub/Sub Health</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Push Sub:</span>
                        <span className={statistics.pubsub.pushSubscription.exists ? 'text-green-600' : 'text-red-600'}>
                          {statistics.pubsub.pushSubscription.exists ? 'OK' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pull Sub:</span>
                        <span className={statistics.pubsub.pullSubscription.exists ? 'text-green-600' : 'text-red-600'}>
                          {statistics.pubsub.pullSubscription.exists ? 'OK' : 'Missing'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-xs text-gray-600">
                    Last updated: {new Date(statistics.timestamp).toLocaleString()}
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

              <div className="space-y-2">
                <Label htmlFor="topicName">Custom Topic Name</Label>
                <Input
                  id="topicName"
                  placeholder="gmail-notifications"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Custom Pub/Sub topic name. Leave empty for default.
                </p>
              </div>

              {status.scopes && status.scopes.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">Current Google Scopes</h4>
                  <div className="flex flex-wrap gap-1">
                    {status.scopes.map((scope, index) => {
                      const shortScope = scope.split('/').pop() || scope;
                      return (
                        <Badge key={index} variant="outline" className="text-xs">
                          {shortScope}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {status.userInfo && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="font-medium text-sm text-green-800 mb-2">Connected Account</h4>
                  <div className="flex items-center gap-3">
                    {status.userInfo.googlePicture && (
                      <img 
                        src={status.userInfo.googlePicture} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium">{status.userInfo.googleName}</div>
                      <div className="text-xs text-gray-600">{status.userInfo.googleEmail}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 