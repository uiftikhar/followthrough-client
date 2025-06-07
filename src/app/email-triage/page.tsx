"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Mail, MessageSquare, Clock, User } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { WebSocketClient, getWebSocketClient } from "@/lib/api/websocket-client";
import { GmailMessagesResponse } from "@/lib/api/gmail-messages-service";
import { GoogleOAuthService } from "@/lib/api/google-oauth-service";
import { HttpClient } from "@/lib/api/http-client";
import { useAuth } from "@/context/AuthContext";

// Enhanced interfaces based on server integration guide
interface EmailReceivedEvent {
  type: "email.received";
  emailId: string;
  emailAddress: string;
  subject: string;
  from: string;
  to: string;
  body: string; // preview
  timestamp: string;
  fullEmail: {
    id: string;
    threadId: string;
    metadata: any;
    bodyLength: number;
  };
}

interface TriageStartedEvent {
  type: "triage.started";
  emailId: string;
  emailAddress: string;
  subject: string;
  from: string;
  timestamp: string;
  source: string;
}

interface TriageProcessingEvent {
  type: "triage.processing";
  sessionId: string;
  emailId: string;
  emailAddress: string;
  subject: string;
  status: string;
  timestamp: string;
  source: string;
}

interface TriageFailedEvent {
  type: "triage.failed";
  sessionId: string;
  emailId: string;
  emailAddress: string;
  error: {
    message: string;
    code?: string;
  };
  timestamp: string;
  source: string;
}

interface GmailDebugInfo {
  currentWatchHistoryId: string;
  gmailCurrentHistoryId: string;
  historyEntriesFound: number;
  messagesInEntries: number;
  recommendation: string;
  details: any;
}

// Updated interfaces to match actual server DTOs
interface EmailTriageResult {
  sessionId: string;
  emailId: string;
  classification: {
    priority: "urgent" | "high" | "normal" | "low";
    category: "bug_report" | "feature_request" | "support" | "billing" | "other";
    reasoning: string;
    confidence: number;
    timing: number;
  };
  summary: {
    problem: string;
    context: string;
    ask: string;
    summary: string;
    timing: number;
  };
  replyDraft: {
    subject: string;
    body: string;
    tone: "professional" | "friendly" | "formal" | "empathetic";
    next_steps: string[];
  };
  status: string;
  processedAt: string;
}

interface TriageCompletedEvent {
  type: "triage.completed";
  sessionId: string;
  emailId: string;
  emailAddress: string;
  result: EmailTriageResult;
  timestamp: string;
  source: string;
}

// Gmail status interfaces based on server guide
interface GmailWatchStatus {
  success: boolean;
  status: {
    user: {
      userId: string;
      isConnectedToGoogle: boolean;
      authenticationStatus: 'not_connected' | 'connected' | 'auth_failed';
    };
    gmail: {
      authenticatedAs: string | null;
      monitoringAccount: string | null;
      accountsMatch: boolean;
      watchActive: boolean;
      watchDetails?: {
        watchId: string;
        expiresAt: string;
        notificationsReceived: number;
        emailsProcessed: number;
        errorCount: number;
      };
    };
    infrastructure: {
      pubsubConfigured: boolean;
    };
    health: {
      overall: 'healthy' | 'issues_detected';
      issues: string[];
      recommendations: string[];
    };
  };
  nextSteps: string[];
}

interface SetupAnalysis {
  required: boolean;
  message: string;
  reason: 'not_authenticated' | 'auth_expired' | 'already_configured' | 'account_mismatch' | 'no_active_watch';
}

export default function EmailTriagePage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [authMessage, setAuthMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  
  // Flow state
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [websocketClient, setWebsocketClient] = useState<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] = useState<string>("disconnected");
  
  // Smart watch detection state
  const [gmailStatus, setGmailStatus] = useState<GmailWatchStatus | null>(null);
  const [isCheckingWatchStatus, setIsCheckingWatchStatus] = useState(false);
  const [setupAnalysis, setSetupAnalysis] = useState<SetupAnalysis | null>(null);
  
  // Email triage data
  const [receivedEmails, setReceivedEmails] = useState<EmailReceivedEvent[]>([]);
  const [startedTriages, setStartedTriages] = useState<TriageStartedEvent[]>([]);
  const [processingTriages, setProcessingTriages] = useState<TriageProcessingEvent[]>([]);
  const [completedTriages, setCompletedTriages] = useState<TriageCompletedEvent[]>([]);
  const [failedTriages, setFailedTriages] = useState<TriageFailedEvent[]>([]);
  const [debugInfo, setDebugInfo] = useState<GmailDebugInfo | null>(null);

  // Check Gmail watch status on mount
  useEffect(() => {
    if (user?.id) {
      checkGmailWatchStatus();
    }
  }, [user?.id]);

  // Handle OAuth callback messages
  useEffect(() => {
    const googleAuthSuccess = searchParams.get("google_auth_success");
    const googleAuthError = searchParams.get("google_auth_error");
    const email = searchParams.get("email");

    if (googleAuthSuccess) {
      setAuthMessage({
        type: "success",
        message: email
          ? `Google services connected successfully! (${decodeURIComponent(email)})`
          : "Google services connected successfully!",
      });
      setIsGoogleAuthorized(true);
      clearUrlParams();
    } else if (googleAuthError) {
      let errorMessage = "Failed to connect Google services.";
      switch (googleAuthError) {
        case "access_denied":
          errorMessage = "Google authorization was denied. Please try again.";
          break;
        case "missing_parameters":
          errorMessage = "OAuth callback was missing required parameters.";
          break;
        case "oauth_expired":
          errorMessage = "OAuth session expired. Please try connecting again.";
          break;
        case "callback_failed":
          errorMessage = "OAuth callback processing failed on our server.";
          break;
        default:
          errorMessage = `Google OAuth error: ${googleAuthError}`;
      }
      setAuthMessage({ type: "error", message: errorMessage });
      clearUrlParams();
    }
  }, [searchParams]);

  // Auto-hide messages
  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => {
        setAuthMessage(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [authMessage]);



  const clearUrlParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("google_auth_success");
    url.searchParams.delete("google_auth_error");
    url.searchParams.delete("email");
    window.history.replaceState({}, "", url.toString());
  };

  const handleAuthSuccess = () => {
    setIsGoogleAuthorized(true);
    setAuthMessage({
      type: "success",
      message: "Google services connected successfully!",
    });
  };

  const handleAuthError = (error: string) => {
    setAuthMessage({ type: "error", message: error });
  };

  // Analyze status to determine if setup is needed (based on server guide)
  const analyzeWatchStatus = (status: GmailWatchStatus['status']): SetupAnalysis => {
    // Check authentication
    if (!status.user.isConnectedToGoogle) {
      return {
        required: false, // Can't setup without auth
        message: 'Complete OAuth authentication first',
        reason: 'not_authenticated'
      };
    }
    
    if (status.user.authenticationStatus === 'auth_failed') {
      return {
        required: false, // Can't setup with failed auth
        message: 'Refresh your Google authorization first',
        reason: 'auth_expired'
      };
    }
    
    // Check watch status
    if (status.gmail.watchActive) {
      if (status.gmail.accountsMatch) {
        return {
          required: false,
          message: 'Gmail notifications already active for correct account',
          reason: 'already_configured'
        };
      } else {
        return {
          required: true,
          message: 'Account mismatch detected - will recreate watch',
          reason: 'account_mismatch'
        };
      }
    }
    
    // Watch not active - setup needed
    return {
      required: true,
      message: 'No active Gmail watch found - will create new watch',
      reason: 'no_active_watch'
    };
  };

  // Check Gmail watch status (based on server guide)
  const checkGmailWatchStatus = async () => {
    if (!user?.id) {
      setAuthMessage({ 
        type: "error", 
        message: "User not authenticated. Please log in." 
      });
      return;
    }

    setIsCheckingWatchStatus(true);
    try {
      console.log('🔍 Checking current Gmail watch status...');
      
      const response = await HttpClient.get('/gmail/client/status');
      const status = await HttpClient.parseJsonResponse<GmailWatchStatus>(response);
      
      console.log('📊 Current Gmail status:', status);
      
      if (!status.success) {
        throw new Error('Failed to check Gmail watch status');
      }
      
      setGmailStatus(status);
      
      // Analyze what needs to be done
      const analysis = analyzeWatchStatus(status.status);
      setSetupAnalysis(analysis);
      
      console.log('📝 Setup analysis:', analysis);
      
      // Update Google authorization state based on actual status
      setIsGoogleAuthorized(status.status.user.isConnectedToGoogle && 
                            status.status.user.authenticationStatus === 'connected');
      
      return status;
      
    } catch (error: any) {
      console.error("Failed to check Gmail watch status:", error);
      setAuthMessage({
        type: "error",
        message: `Failed to check Gmail status: ${error.message || error}`
      });
    } finally {
      setIsCheckingWatchStatus(false);
    }
  };

  // Smart setup function - only sets up if needed (based on server guide)
  const smartSetupEmailNotifications = async () => {
    if (!user?.id) {
      setAuthMessage({ 
        type: "error", 
        message: "User not authenticated. Please log in." 
      });
      return;
    }

    try {
      setConnectionState("connecting");
      
      // Step 1: Check current status first
      console.log('🔍 Checking current Gmail watch status...');
      const status = await checkGmailWatchStatus();
      
      if (!status || !setupAnalysis) {
        throw new Error('Failed to get Gmail status');
      }
      
      // Step 2: Analyze if setup is needed
      if (!setupAnalysis.required) {
        console.log('✅ Gmail notifications already configured properly');
        setAuthMessage({
          type: "success",
          message: setupAnalysis.message
        });
        
        // If already configured, just setup WebSocket
        if (setupAnalysis.reason === 'already_configured') {
          await setupWebSocketConnection(status.status.gmail.authenticatedAs || '');
        }
        return;
      }
      
      // Step 3: Setup only if needed
      console.log('🚀 Setting up Gmail notifications...');
      console.log('📝 Reason:', setupAnalysis.reason);
      
      const setupResponse = await HttpClient.post("/gmail/client/setup-notifications");
      const setupResult = await HttpClient.parseJsonResponse<{
        success: boolean;
        message: string;
        watchInfo?: {
          watchId: string;
          historyId: string;
          expiresAt: string;
          isActive: boolean;
          googleEmail: string;
          notificationsReceived: number;
          emailsProcessed: number;
          errorCount: number;
          userId: string;
        };
      }>(setupResponse);
      
      console.log("📧 Gmail setup result:", setupResult);
      
      if (!setupResult.success) {
        throw new Error(setupResult.message || "Failed to setup Gmail notifications");
      }

      setAuthMessage({
        type: "success", 
        message: `Gmail notifications setup successful! Active watch created for ${setupResult.watchInfo?.googleEmail}`
      });

      // Step 4: Setup WebSocket connection
      await setupWebSocketConnection(setupResult.watchInfo?.googleEmail || '');
      
      // Step 5: Refresh status after successful setup
      await checkGmailWatchStatus();
      
    } catch (error: any) {
      console.error("Failed to setup email notifications:", error);
      setConnectionState("error");
      setAuthMessage({
        type: "error",
        message: `Failed to setup notifications: ${error.message || error}`
      });
    }
  };

  // Separate WebSocket setup function
  const setupWebSocketConnection = async (emailAddress: string) => {
    console.log("🔌 Setting up WebSocket connection...");
    const client = getWebSocketClient({ debug: true });
    
    // Set up event listeners
    client.on("connected", (data) => {
      setConnectionState("connected");
      setAuthMessage({
        type: "success",
        message: "WebSocket connected successfully! Now listening for email notifications."
      });
      console.log("✅ WebSocket connected:", data);
    });

    client.on("email.received", (data: EmailReceivedEvent) => {
      console.log("📧 Email received:", data);
      setReceivedEmails(prev => [data, ...prev]);
    });

    client.on("triage.started", (data: TriageStartedEvent) => {
      console.log("🚀 Triage started:", data);
      setStartedTriages(prev => [data, ...prev]);
    });

    client.on("triage.processing", (data: TriageProcessingEvent) => {
      console.log("⚡ Triage processing:", data);
      setProcessingTriages(prev => {
        const existing = prev.find(t => t.sessionId === data.sessionId);
        if (existing) {
          return prev.map(t => t.sessionId === data.sessionId ? data : t);
        }
        return [data, ...prev];
      });
    });

    client.on("triage.completed", (data: TriageCompletedEvent) => {
      console.log("✅ Triage completed:", data);
      setCompletedTriages(prev => [data, ...prev]);
      // Remove from processing
      setProcessingTriages(prev => prev.filter(t => t.sessionId !== data.sessionId));
    });

    client.on("triage.failed", (data: TriageFailedEvent) => {
      console.log("❌ Triage failed:", data);
      setFailedTriages(prev => [data, ...prev]);
      // Remove from processing
      setProcessingTriages(prev => prev.filter(t => t.sessionId !== data.sessionId));
    });

    client.on("disconnect", () => {
      setConnectionState("disconnected");
      console.log("❌ WebSocket disconnected");
    });

    client.on("error", (error) => {
      setConnectionState("error");
      setAuthMessage({
        type: "error",
        message: `WebSocket error: ${error.message || error}`
      });
      console.error("❌ WebSocket error:", error);
    });

    // Connect and subscribe
    await client.connect();
    
    client.subscribe({ 
      userId: user?.id || '',
      emailAddress: emailAddress
    });
    
    setWebsocketClient(client);
    console.log("🎉 WebSocket connection established!");
  };

  const disconnectNotifications = () => {
    if (websocketClient) {
      websocketClient.disconnect();
      setWebsocketClient(null);
      setConnectionState("disconnected");
      setReceivedEmails([]);
      setStartedTriages([]);
      setProcessingTriages([]);
      setCompletedTriages([]);
      setFailedTriages([]);
      setAuthMessage({
        type: "success",
        message: "Disconnected from email notifications"
      });
    }
  };

  const debugGmailIssues = async () => {
    if (!user?.email) return;
    
    try {
      const response = await HttpClient.get(`/api/gmail/webhooks/debug/${encodeURIComponent(user.email)}`);
      const debugData = await HttpClient.parseJsonResponse<GmailDebugInfo>(response);
      setDebugInfo(debugData);
      setAuthMessage({
        type: "success",
        message: "Debug information retrieved successfully"
      });
    } catch (error: any) {
      console.error("Failed to debug Gmail issues:", error);
      setAuthMessage({
        type: "error",
        message: `Debug failed: ${error.message || error}`
      });
    }
  };

  const forceRefresh = async () => {
    if (!user?.email) return;
    
    try {
      const response = await HttpClient.post(`/api/gmail/webhooks/force-refresh/${encodeURIComponent(user.email)}`);
      const result = await HttpClient.parseJsonResponse(response);
      setAuthMessage({
        type: "success",
        message: "Force refresh completed successfully"
      });
      // Refresh debug info
      await debugGmailIssues();
    } catch (error: any) {
      console.error("Failed to force refresh:", error);
      setAuthMessage({
        type: "error",
        message: `Force refresh failed: ${error.message || error}`
      });
    }
  };

  if (isCheckingWatchStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking Gmail watch status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Triage</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Automatically triage and analyze your Gmail messages with AI
        </p>
      </div>

      {/* Auth Messages */}
      {authMessage && (
        <Alert variant={authMessage.type === "error" ? "destructive" : "default"}>
          {authMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {authMessage.type === "success" ? "Success" : "Error"}
          </AlertTitle>
          <AlertDescription>{authMessage.message}</AlertDescription>
        </Alert>
      )}

      {/* Smart Status Display */}
      {setupAnalysis && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Gmail Notification Status</h2>
          
          {/* Current Status Info */}
          {gmailStatus && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Authentication:</strong> {gmailStatus.status.user.authenticationStatus}
                </div>
                <div>
                  <strong>Google Connected:</strong> {gmailStatus.status.user.isConnectedToGoogle ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>Watch Active:</strong> {gmailStatus.status.gmail.watchActive ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>Accounts Match:</strong> {gmailStatus.status.gmail.accountsMatch ? '✅ Yes' : '⚠️ No'}
                </div>
                {gmailStatus.status.gmail.authenticatedAs && (
                  <div className="md:col-span-2">
                    <strong>Gmail Account:</strong> {gmailStatus.status.gmail.authenticatedAs}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Required */}
          <div className={`p-4 rounded-lg border ${
            setupAnalysis.reason === 'already_configured' 
              ? 'bg-green-50 border-green-200' 
              : setupAnalysis.reason === 'not_authenticated' || setupAnalysis.reason === 'auth_expired'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className="mb-4 font-medium">
              {setupAnalysis.message}
            </p>
            
            {/* Show appropriate action button */}
            {setupAnalysis.reason === 'not_authenticated' && (
              <GoogleAuthButton
                onAuthSuccess={handleAuthSuccess}
                onAuthError={handleAuthError}
              />
            )}
            
            {setupAnalysis.reason === 'auth_expired' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Your Google authorization has expired.</p>
                <GoogleAuthButton
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={handleAuthError}
                />
              </div>
            )}
            
            {(setupAnalysis.reason === 'no_active_watch' || setupAnalysis.reason === 'account_mismatch') && (
              <Button
                onClick={smartSetupEmailNotifications}
                className="bg-green-600 hover:bg-green-700"
                disabled={connectionState === "connecting"}
              >
                {connectionState === "connecting" ? "Setting up notifications..." : "Setup Gmail Notifications"}
              </Button>
            )}
            
            {setupAnalysis.reason === 'already_configured' && !websocketClient && (
              <Button
                onClick={smartSetupEmailNotifications}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={connectionState === "connecting"}
              >
                {connectionState === "connecting" ? "Connecting..." : "Connect to Real-time Updates"}
              </Button>
            )}
          </div>
          
          {/* Refresh Status Button */}
          <div className="mt-4">
            <Button
              onClick={checkGmailWatchStatus}
              variant="outline"
              size="sm"
              disabled={isCheckingWatchStatus}
            >
              {isCheckingWatchStatus ? "Checking..." : "Refresh Status"}
            </Button>
          </div>
        </div>
      )}

      {/* Initial Loading State */}
      {!setupAnalysis && !isCheckingWatchStatus && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Email Triage Setup</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Click below to check your current Gmail notification status.
          </p>
          <Button
            onClick={checkGmailWatchStatus}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Check Gmail Status
          </Button>
        </div>
      )}

      {/* Step 3: Connection Status & Controls */}
      {websocketClient && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Email Triage Connection</h2>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connectionState === "connected" 
                  ? "bg-green-100 text-green-800" 
                  : connectionState === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionState === "connected" ? "bg-green-500" : 
                  connectionState === "error" ? "bg-red-500" : "bg-gray-500"
                }`}></div>
                <span className="capitalize">{connectionState}</span>
              </div>
              <Button
                onClick={disconnectNotifications}
                variant="outline"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Connected to email triage system. You'll receive real-time notifications for new emails and completed triages.
          </p>
        </div>
      )}

      {/* Email Data Sections */}
      {websocketClient && connectionState === "connected" && (
        <div className="space-y-6">
          {/* Management Actions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-4">Gmail Management</h3>
            <div className="flex items-center space-x-4">
              <Button onClick={debugGmailIssues} variant="outline" size="sm">
                🔍 Debug Gmail Issues
              </Button>
              <Button onClick={forceRefresh} variant="outline" size="sm">
                🔄 Force Refresh
              </Button>
            </div>
            
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Debug Information</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Current Watch History ID:</strong> {debugInfo.currentWatchHistoryId}</div>
                  <div><strong>Gmail Current History ID:</strong> {debugInfo.gmailCurrentHistoryId}</div>
                  <div><strong>History Entries Found:</strong> {debugInfo.historyEntriesFound}</div>
                  <div><strong>Messages in Entries:</strong> {debugInfo.messagesInEntries}</div>
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <strong>Recommendation:</strong> {debugInfo.recommendation}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Received Emails */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center space-x-2 mb-4">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Received Emails</h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {receivedEmails.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {receivedEmails.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    No new emails received yet. Send an email to your connected Gmail account to test.
                  </p>
                ) : (
                  receivedEmails.map((email, index) => (
                    <div key={`${email.emailId}-${index}`} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm truncate">
                          {email.subject}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(email.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div><strong>From:</strong> {email.from}</div>
                        <div><strong>To:</strong> {email.to}</div>
                        <div className="bg-gray-50 p-2 rounded text-xs">
                          {email.body.substring(0, 100)}...
                        </div>
                        <div className="text-gray-400">
                          ID: {email.emailId} | Length: {email.fullEmail.bodyLength}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Started Triages */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Started Triages</h3>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                  {startedTriages.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {startedTriages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    No triages started yet.
                  </p>
                ) : (
                  startedTriages.map((triage, index) => (
                    <div key={`${triage.emailId}-${index}`} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          {triage.subject}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(triage.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div><strong>From:</strong> {triage.from}</div>
                        <div><strong>Email ID:</strong> {triage.emailId}</div>
                        <div><strong>Account:</strong> {triage.emailAddress}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Processing Triages */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center space-x-2 mb-4">
                <div className="animate-spin h-5 w-5 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                <h3 className="text-lg font-semibold">Processing</h3>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {processingTriages.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {processingTriages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    No triages currently processing.
                  </p>
                ) : (
                  processingTriages.map((triage, index) => (
                    <div key={`${triage.sessionId}-${index}`} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          Session: {triage.sessionId.substring(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(triage.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div><strong>Email ID:</strong> {triage.emailId}</div>
                        <div><strong>Subject:</strong> {triage.subject}</div>
                        <div><strong>Status:</strong> {triage.status}</div>
                        <div><strong>Account:</strong> {triage.emailAddress}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Completed and Failed Triages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completed Triages */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Completed Triages</h3>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {completedTriages.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {completedTriages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    No triages completed yet. Email triages will appear here once processing is complete.
                  </p>
                ) : (
                  completedTriages.map((triage, index) => (
                    <div key={`${triage.sessionId}-${index}`} className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          Session: {triage.sessionId.substring(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(triage.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      
                                              <div className="space-y-2 text-sm">
                        <div className="text-xs text-gray-600">
                          <strong>Email ID:</strong> {triage.emailId}
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Account:</strong> {triage.emailAddress}
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Status:</strong> {triage.result.status} | <strong>Processed:</strong> {new Date(triage.result.processedAt).toLocaleTimeString()}
                        </div>
                        
                        {/* Classification */}
                        <div className="border-t pt-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              triage.result.classification.priority === "urgent" ? "bg-red-100 text-red-800" :
                              triage.result.classification.priority === "high" ? "bg-orange-100 text-orange-800" :
                              triage.result.classification.priority === "normal" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {triage.result.classification.priority}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                              {triage.result.classification.category.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(triage.result.classification.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Summary */}
                        <div className="border-t pt-2">
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><strong>Problem:</strong> {triage.result.summary.problem.substring(0, 80)}...</div>
                            <div><strong>Ask:</strong> {triage.result.summary.ask.substring(0, 80)}...</div>
                            <div className="text-gray-500">
                              <strong>Summary Timing:</strong> {triage.result.summary.timing}ms | 
                              <strong>Classification Timing:</strong> {triage.result.classification.timing}ms
                            </div>
                          </div>
                        </div>
                        
                        {/* Reply Draft Preview */}
                        <div className="border-t pt-2">
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><strong>Reply Subject:</strong> {triage.result.replyDraft.subject}</div>
                            <div><strong>Tone:</strong> {triage.result.replyDraft.tone}</div>
                            <div className="max-h-16 overflow-y-auto bg-gray-100 p-2 rounded text-xs">
                              {triage.result.replyDraft.body.substring(0, 200)}...
                            </div>
                            {triage.result.replyDraft.next_steps.length > 0 && (
                              <div className="mt-1">
                                <strong>Next Steps:</strong>
                                <ul className="ml-2 text-xs">
                                  {triage.result.replyDraft.next_steps.slice(0, 2).map((step, i) => (
                                    <li key={i}>• {step.substring(0, 50)}...</li>
                                  ))}
                                  {triage.result.replyDraft.next_steps.length > 2 && (
                                    <li>• +{triage.result.replyDraft.next_steps.length - 2} more...</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Failed Triages */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold">Failed Triages</h3>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {failedTriages.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {failedTriages.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">
                    No failed triages. This is good!
                  </p>
                ) : (
                  failedTriages.map((triage, index) => (
                    <div key={`${triage.sessionId}-${index}`} className="border border-red-200 rounded-lg p-3 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          Session: {triage.sessionId.substring(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(triage.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="text-xs text-gray-600">
                          <strong>Email ID:</strong> {triage.emailId}
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Account:</strong> {triage.emailAddress}
                        </div>
                        <div className="border-t pt-2">
                          <div className="text-xs text-red-700">
                            <strong>Error:</strong> {triage.error.message}
                            {triage.error.code && (
                              <div><strong>Code:</strong> {triage.error.code}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}