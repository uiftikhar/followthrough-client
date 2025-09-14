// Analytics Usage Examples for Followthrough Client
// This file contains examples of how to implement PostHog analytics throughout the app

import { useAnalytics } from './analytics';

// 1. USER AUTHENTICATION & ONBOARDING
export function useAuthAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track user signup
    trackSignup: (method: 'google' | 'email', userEmail?: string) => {
      analytics.trackSignup(method, { email: userEmail });
      
      // Identify the user for future tracking
      if (userEmail) {
        analytics.identifyUser(userEmail, {
          email: userEmail,
          signup_method: method,
          onboarding_completed: false
        });
      }
    },

    // Track user login
    trackLogin: (method: 'google' | 'email' | 'session', userEmail?: string) => {
      analytics.trackLogin(method);
      
      if (userEmail) {
        analytics.identifyUser(userEmail);
      }
    },

    // Track onboarding steps
    trackOnboardingComplete: () => {
      analytics.trackOnboardingStep('onboarding_completed', true);
      analytics.track('User Onboarding Completed', {
        completion_time: new Date().toISOString()
      });
    }
  };
}

// 2. MEETING ANALYSIS WORKFLOW
export function useMeetingAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track when user uploads a meeting
    trackMeetingUpload: (sessionId: string, fileType: 'audio' | 'video' | 'text', durationMinutes?: number) => {
      analytics.trackMeetingUpload({
        session_id: sessionId,
        file_type: fileType,
        duration_minutes: durationMinutes,
        upload_method: 'drag_drop' // or 'file_picker', 'gmail_integration'
      });
    },

    // Track analysis start
    trackAnalysisStart: (sessionId: string) => {
      analytics.trackAnalysisStarted(sessionId);
    },

    // Track successful analysis completion
    trackAnalysisSuccess: (sessionId: string, results: {
      topicsCount: number;
      actionItemsCount: number;
      processingTimeSeconds: number;
      hasSentiment: boolean;
    }) => {
      analytics.trackAnalysisCompleted({
        session_id: sessionId,
        topics_found: results.topicsCount,
        action_items_found: results.actionItemsCount,
        processing_time_seconds: results.processingTimeSeconds,
        sentiment_analyzed: results.hasSentiment,
        status: 'completed'
      });
    },

    // Track analysis errors
    trackAnalysisError: (sessionId: string, error: string, step?: string) => {
      analytics.trackAnalysisError(sessionId, error, step);
    }
  };
}

// 3. ACTION ITEMS MANAGEMENT
export function useActionItemAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track action item creation
    trackActionItemCreated: (sessionId: string, actionItem: {
      priority?: string;
      hasAssignee: boolean;
      hasDueDate: boolean;
      hasAcceptanceCriteria: boolean;
      storyPoints?: number;
    }) => {
      analytics.trackActionItemCreated({
        session_id: sessionId,
        priority: actionItem.priority as any,
        assignee_set: actionItem.hasAssignee,
        has_due_date: actionItem.hasDueDate,
        has_acceptance_criteria: actionItem.hasAcceptanceCriteria,
        story_points: actionItem.storyPoints,
        source: 'meeting_analysis'
      });
    },

    // Track action item completion
    trackActionItemCompleted: (actionItemId: string, sessionId?: string) => {
      analytics.trackActionItemCompleted(actionItemId, sessionId);
    },

    // Track Jira integration
    trackJiraIntegration: (actionItemsCount: number, success: boolean, error?: string) => {
      analytics.trackJiraPush(actionItemsCount, success, error);
    }
  };
}

// 4. FEATURE USAGE TRACKING
export function useFeatureAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track tab switches in results view
    trackTabSwitch: (fromTab: string, toTab: string, sessionId?: string) => {
      analytics.trackTabSwitch(fromTab, toTab, sessionId);
    },

    // Track visualization interactions
    trackVisualizationUsage: (sessionId: string, interactionType: string, details?: Record<string, any>) => {
      analytics.trackVisualizationInteraction(interactionType, sessionId, details);
    },

    // Track feature usage
    trackFeatureUsage: (feature: string, properties?: Record<string, any>) => {
      analytics.trackFeatureUsed(feature, properties);
    },

    // Track button clicks and UI interactions
    trackButtonClick: (buttonName: string, context?: string, properties?: Record<string, any>) => {
      analytics.track('Button Clicked', {
        button_name: buttonName,
        context,
        ...properties
      });
    }
  };
}

// 5. ERROR TRACKING
export function useErrorAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track application errors
    trackError: (error: Error, context?: Record<string, any>) => {
      analytics.trackError(error, context);
    },

    // Track API errors
    trackApiError: (endpoint: string, statusCode: number, errorMessage: string) => {
      analytics.track('API Error', {
        endpoint,
        status_code: statusCode,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      });
    },

    // Track user-facing errors
    trackUserError: (errorType: string, message: string, context?: Record<string, any>) => {
      analytics.track('User Error', {
        error_type: errorType,
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// 6. GMAIL INTEGRATION TRACKING
export function useGmailAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track Gmail connection
    trackGmailConnection: (success: boolean, permissions: string[] = []) => {
      analytics.trackGmailConnection(success, permissions);
    },

    // Track email triage usage
    trackEmailTriage: (emailsProcessed: number, actionItemsCreated: number) => {
      analytics.track('Email Triage Used', {
        emails_processed: emailsProcessed,
        action_items_created: actionItemsCreated,
        timestamp: new Date().toISOString()
      });
    },

    // Track notification preferences
    trackNotificationSettings: (enabled: boolean, frequency?: string) => {
      analytics.track('Notification Settings Changed', {
        notifications_enabled: enabled,
        frequency,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// 7. BUSINESS METRICS TRACKING
export function useBusinessAnalytics() {
  const analytics = useAnalytics();

  return {
    // Track conversion funnel
    trackConversionStep: (step: string, completed: boolean, properties?: Record<string, any>) => {
      analytics.track('Conversion Step', {
        step,
        completed,
        ...properties,
        timestamp: new Date().toISOString()
      });
    },

    // Track user engagement
    trackEngagement: (feature: string, duration: number, interactions: number) => {
      analytics.track('User Engagement', {
        feature,
        duration_seconds: duration,
        interactions_count: interactions,
        timestamp: new Date().toISOString()
      });
    },

    // Track retention indicators
    trackRetentionEvent: (eventType: string, properties?: Record<string, any>) => {
      analytics.track('Retention Event', {
        event_type: eventType,
        ...properties,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// USAGE IN COMPONENTS:
/*

// In a React component:
import { useAuthAnalytics } from '@/lib/analytics-usage-examples';

function LoginPage() {
  const authAnalytics = useAuthAnalytics();
  
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      authAnalytics.trackLogin('google', result.user.email);
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
}

// In meeting analysis:
import { useMeetingAnalytics } from '@/lib/analytics-usage-examples';

function MeetingUpload() {
  const meetingAnalytics = useMeetingAnalytics();
  
  const handleFileUpload = (file: File, sessionId: string) => {
    meetingAnalytics.trackMeetingUpload(
      sessionId, 
      'audio', 
      45 // duration in minutes
    );
  };
}

*/
