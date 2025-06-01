"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGmailTriage } from '@/hooks/useGmailTriage';
import { useGmailNotifications } from '@/hooks/useGmailNotifications';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { 
  GmailAuthService
} from '@/lib/api/gmail-auth-service';
import { 
  GmailNotificationsService
} from '@/lib/api/gmail-notifications-service';
import { 
  GmailTriageService
} from '@/lib/api/gmail-triage-service';
import { 
  GmailHealthService
} from '@/lib/api/gmail-health-service';
import { 
  GmailMessagesService
} from '@/lib/api/gmail-messages-service';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export function GmailServicesTest() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Test hooks
  const gmailTriage = useGmailTriage({ debug: true });
  const gmailNotifications = useGmailNotifications();
  const connectionStatus = useConnectionStatus();

  const testService = async (serviceName: string, testFn: () => Promise<any>) => {
    try {
      setIsLoading(true);
      const result = await testFn();
      setTestResults(prev => ({
        ...prev,
        [serviceName]: { success: true, result }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [serviceName]: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults({});
    
    // Test authentication status
    await testService('GmailAuthService.isAuthenticated', () => 
      Promise.resolve(GmailAuthService.isAuthenticated())
    );

    // Test OAuth status (only if authenticated)
    if (GmailAuthService.isAuthenticated()) {
      await testService('GmailAuthService.getOAuthStatus', () => 
        GmailAuthService.getOAuthStatus()
      );
    }

    // Test health service
    await testService('GmailHealthService.getSystemHealth', () => 
      GmailHealthService.getSystemHealth()
    );

    // Test notifications service status
    await testService('GmailNotificationsService.getStatus', () => 
      GmailNotificationsService.getStatus()
    );

    // Test messages service (only if authenticated)
    if (GmailAuthService.isAuthenticated()) {
      await testService('GmailMessagesService.getProfile', () => 
        GmailMessagesService.getProfile()
      );
    }
  };

  const getStatusIcon = (result: any) => {
    if (!result) return <RefreshCw className="h-4 w-4 text-gray-400" />;
    if (result.success) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (result: any) => {
    if (!result) return <Badge variant="outline">Not Tested</Badge>;
    if (result.success) return <Badge variant="default" className="bg-green-500">Success</Badge>;
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gmail Services Test Suite</h1>
        <Button 
          onClick={runAllTests} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Run All Tests
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hook Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">React Hooks Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">useGmailTriage</h4>
              <div className="flex items-center justify-between">
                <span>Authenticated:</span>
                <Badge variant={gmailTriage.isAuthenticated ? 'default' : 'secondary'}>
                  {gmailTriage.isAuthenticated ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Connection:</span>
                <Badge variant="outline">{gmailTriage.connectionState}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>System Health:</span>
                <Badge variant={gmailTriage.systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                  {gmailTriage.systemHealth.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">useGmailNotifications</h4>
              <div className="flex items-center justify-between">
                <span>Enabled:</span>
                <Badge variant={gmailNotifications.status.isEnabled ? 'default' : 'secondary'}>
                  {gmailNotifications.status.isEnabled ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Loading:</span>
                <Badge variant={gmailNotifications.isLoading ? 'outline' : 'secondary'}>
                  {gmailNotifications.isLoading ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">useConnectionStatus</h4>
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant="outline">{connectionStatus.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Checked:</span>
                <span className="text-sm text-gray-600">
                  {connectionStatus.lastChecked?.toLocaleTimeString() || 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service API Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'GmailAuthService.isAuthenticated',
              'GmailAuthService.getOAuthStatus',
              'GmailHealthService.getSystemHealth',
              'GmailNotificationsService.getStatus',
              'GmailMessagesService.getProfile'
            ].map((serviceName) => (
              <div key={serviceName} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults[serviceName])}
                  <span className="text-sm font-mono">{serviceName.split('.').pop()}</span>
                </div>
                {getStatusBadge(testResults[serviceName])}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Test Results Details */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Results Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(testResults).map(([serviceName, result]) => (
                <div key={serviceName} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium font-mono text-sm">{serviceName}</h4>
                    {getStatusBadge(result)}
                  </div>
                  
                  {result.success ? (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <pre className="text-xs text-green-800 overflow-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Error:</span>
                      </div>
                      <p className="text-xs text-red-700 mt-1">{result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {(gmailTriage.error || gmailNotifications.error) && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hook Errors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gmailTriage.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <span className="text-sm font-medium text-red-800">useGmailTriage:</span>
                <p className="text-xs text-red-700">{gmailTriage.error}</p>
              </div>
            )}
            {gmailNotifications.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <span className="text-sm font-medium text-red-800">useGmailNotifications:</span>
                <p className="text-xs text-red-700">{gmailNotifications.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 