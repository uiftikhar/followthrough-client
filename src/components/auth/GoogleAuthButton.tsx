"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleOAuthService, GoogleConnectionStatus } from "@/lib/api/google-oauth-service";
import { Mail, Calendar, Video, Shield, CheckCircle2, AlertCircle, RefreshCw, TestTube } from "lucide-react";

interface GoogleAuthButtonProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
}

export function GoogleAuthButton({
  onAuthSuccess,
  onAuthError,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [status, setStatus] = useState<GoogleConnectionStatus>({
    isConnected: false
  });
  const [error, setError] = useState<string | null>(null);

  // Load connection status on component mount
  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const loadConnectionStatus = async () => {
    try {
      const isAuth = await GoogleOAuthService.isAuthenticated();
      setIsUserAuthenticated(isAuth);
      
      if (!isAuth) {
        setError('Please log in first to connect Google services');
        return;
      }

      const connectionStatus = await GoogleOAuthService.getGoogleConnectionStatus();
      setStatus(connectionStatus);
      setError(null);
    } catch (error) {
      console.error('Failed to load Google connection status:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setIsUserAuthenticated(false);
    }
  };

  const handleAuthorize = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const isAuth = await GoogleOAuthService.isAuthenticated();
      if (!isAuth) {
        throw new Error('Please log in first to connect Google services');
      }
      
      // This will redirect to Google OAuth via our server
      await GoogleOAuthService.initiateGoogleOAuth();
      
    } catch (error) {
      console.error('Failed to initiate Google authorization:', error);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onAuthError?.(errorMessage);
    }
  };

  const handleRevoke = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await GoogleOAuthService.revokeGoogleAccess();
      
      if (success) {
        setStatus({ isConnected: false });
        onAuthSuccess?.();
      } else {
        throw new Error('Failed to revoke Google access');
      }
      
    } catch (error) {
      console.error('Failed to revoke Google authorization:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const testResult = await GoogleOAuthService.testGoogleConnection();
      
      if (testResult.success) {
        alert(
          `Google connection works!\n\n` +
          `Email: ${testResult.testResult?.email}\n` +
          `Name: ${testResult.testResult?.name}\n` +
          `Verified: ${testResult.testResult?.verified ? 'Yes' : 'No'}`
        );
      } else {
        throw new Error(testResult.message || 'Connection test failed');
      }
      
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await GoogleOAuthService.refreshTokens();
      await loadConnectionStatus(); // Reload status after refresh
      
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
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
            <CardTitle className="text-lg text-red-800">Google Auth Error</CardTitle>
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
                loadConnectionStatus();
              }}
              disabled={isLoading}
            >
              Retry
            </Button>
            {!isUserAuthenticated ? (
              <Button
                onClick={() => window.location.href = '/auth/login'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Log In
              </Button>
            ) : (
              <Button
                onClick={handleAuthorize}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Connecting..." : "Try Connect Google"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show connected state
  if (status.isConnected) {
    return (
      <Card className="w-full border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">Google Services Connected</CardTitle>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Active
            </Badge>
          </div>
          <CardDescription>
            Your account is connected to Google services
            {status.userInfo?.googleEmail && (
              <span className="block mt-1 font-medium text-sm">
                Connected as: {status.userInfo.googleEmail}
              </span>
            )}
            {status.expiresAt && (
              <span className="block mt-1 text-xs text-gray-500">
                Expires: {new Date(status.expiresAt).toLocaleString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Gmail</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Calendar</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <Video className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Meet</span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isLoading}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isLoading ? "Testing..." : "Test Connection"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoading ? "Refreshing..." : "Refresh Tokens"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRevoke}
              disabled={isLoading}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isLoading ? "Revoking..." : "Revoke Access"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show disconnected state
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Authorize Google Access</CardTitle>
        </div>
        <CardDescription>
          Connect your Google account to enable Gmail, Calendar, and Meet integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This will allow the application to:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-blue-600" />
              <span>Read and send emails through Gmail</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-600" />
              <span>Access and manage your Google Calendar</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-purple-600" />
              <span>Access Google Meet information via Calendar</span>
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Secure Server-Side Authentication</p>
              <p className="mt-1">
                All OAuth tokens are securely stored on our server. 
                Your credentials never leave our secure environment.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleAuthorize}
          disabled={isLoading || !isUserAuthenticated}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Connecting..." : "Authorize Google Access"}
        </Button>
        
        {!isUserAuthenticated && (
          <p className="text-sm text-gray-500 text-center">
            Please <a href="/auth/login" className="text-blue-600 underline">log in</a> first to connect Google services
          </p>
        )}
      </CardContent>
    </Card>
  );
} 