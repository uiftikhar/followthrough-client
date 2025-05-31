'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { GmailNotificationsButton } from "@/components/auth/GmailNotificationsButton";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [authMessage, setAuthMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { logout } = useAuth();

  useEffect(() => {
    // Check for OAuth callback messages from server
    const googleAuthSuccess = searchParams.get('google_auth_success');
    const googleAuthError = searchParams.get('google_auth_error');
    const email = searchParams.get('email');

    if (googleAuthSuccess) {
      setAuthMessage({
        type: 'success',
        message: email 
          ? `Google services have been successfully connected! (${decodeURIComponent(email)})`
          : 'Google services have been successfully connected!'
      });
      
      // Clear the URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('google_auth_success');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    } else if (googleAuthError) {
      let errorMessage = 'Failed to connect Google services.';
      
      switch (googleAuthError) {
        case 'access_denied':
          errorMessage = 'Google authorization was denied. Please try again if you want to enable Google integration.';
          break;
        case 'missing_parameters':
          errorMessage = 'OAuth callback was missing required parameters.';
          break;
        case 'oauth_expired':
          errorMessage = 'OAuth session expired. Please try connecting again.';
          break;
        case 'callback_failed':
          errorMessage = 'OAuth callback processing failed on our server.';
          break;
        default:
          errorMessage = `Google OAuth error: ${googleAuthError}`;
      }
      
      setAuthMessage({
        type: 'error',
        message: errorMessage
      });
      
      // Clear the URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('google_auth_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleAuthSuccess = () => {
    setAuthMessage({
      type: 'success',
      message: 'Google services connected successfully!'
    });
  };

  const handleAuthError = (error: string) => {
    setAuthMessage({
      type: 'error',
      message: error
    });
  };

  const handleNotificationStatusChange = (status: any) => {
    // Since notificationsEnabled is now derived from health data,
    // we'll check if the operation was successful
    if (status.success && status.isConnected) {
      setAuthMessage({
        type: 'success',
        message: 'Gmail connection updated successfully!'
      });
    }
  };

  const handleNotificationError = (error: string) => {
    setAuthMessage({
      type: 'error',
      message: `Gmail Notifications Error: ${error}`
    });
  };

  // Auto-hide messages after 10 seconds
  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => {
        setAuthMessage(null);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [authMessage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome to the Productive AI Transcript Analysis Dashboard
        </p>
      </div>

      <Button onClick={logout}>Logout</Button>

      {/* Auth Messages */}
      {authMessage && (
        <Alert variant={authMessage.type === 'error' ? 'destructive' : 'default'}>
          {authMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {authMessage.type === 'success' ? 'Success' : 'Error'}
          </AlertTitle>
          <AlertDescription>{authMessage.message}</AlertDescription>
        </Alert>
      )}

      {/* Google Authorization Section */}
      <GoogleAuthButton
        onAuthSuccess={handleAuthSuccess}
        onAuthError={handleAuthError}
      />

      {/* Gmail Push Notifications Section */}
      <GmailNotificationsButton
        onStatusChange={handleNotificationStatusChange}
        onError={handleNotificationError}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Transcripts Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-2 text-xl font-semibold">Transcripts</h2>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Upload and manage your meeting transcripts
          </p>
          <Link
            href="/dashboard/transcripts"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View Transcripts
          </Link>
        </div>

        {/* Analysis Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-2 text-xl font-semibold">Analysis</h2>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            View analysis results and insights from your transcripts
          </p>
          <Link
            href="/dashboard/analysis"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View Analysis
          </Link>
        </div>

        {/* Knowledge Map Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-2 text-xl font-semibold">Knowledge Map</h2>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Visualize relationships and gaps in knowledge
          </p>
          <Link
            href="/dashboard/knowledge-map"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View Knowledge Map
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
        <div className="space-y-4">
          <p className="italic text-gray-500 dark:text-gray-400">
            No recent activity to display.
          </p>
        </div>
      </div>
    </div>
  );
}
