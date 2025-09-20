import posthog from 'posthog-js';

// Types for our analytics events
export interface UserProperties {
  email?: string;
  name?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  signup_method?: 'google' | 'email';
  onboarding_completed?: boolean;
  gmail_connected?: boolean;
  first_meeting_analyzed?: boolean;
}

export interface MeetingAnalysisEvent {
  session_id: string;
  file_type?: 'audio' | 'video' | 'text';
  duration_minutes?: number;
  upload_method?: 'drag_drop' | 'file_picker' | 'gmail_integration';
  processing_time_seconds?: number;
  topics_found?: number;
  action_items_found?: number;
  sentiment_analyzed?: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface ActionItemEvent {
  session_id?: string;
  action_item_id?: string;
  priority?: 'high' | 'medium' | 'low';
  assignee_set?: boolean;
  has_due_date?: boolean;
  has_acceptance_criteria?: boolean;
  component?: string;
  epic?: string;
  story_points?: number;
  source?: 'meeting_analysis' | 'manual_creation';
}

export interface FeatureUsageEvent {
  feature: string;
  session_duration_seconds?: number;
  interactions_count?: number;
  tab_name?: string;
  visualization_type?: string;
  action_items_count?: number;
  session_id?: string;
}

class AnalyticsService {
  private initialized = false;

  constructor() {
    // Ensure PostHog is initialized before using
    if (typeof window !== 'undefined' && posthog.__loaded) {
      this.initialized = true;
    }
  }

  private ensureInitialized(): boolean {
    if (!this.initialized && typeof window !== 'undefined') {
      this.initialized = posthog.__loaded;
    }
    return this.initialized;
  }

  // User Lifecycle Events
  identifyUser(userId: string, properties: UserProperties = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.identify(userId, {
      ...properties,
      $set: properties,
      $set_once: {
        first_seen: new Date().toISOString(),
      }
    });
  }

  trackSignup(method: 'google' | 'email', properties: Record<string, any> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('User Signed Up', {
      method,
      timestamp: new Date().toISOString(),
      ...properties
    });
  }

  trackLogin(method: 'google' | 'email' | 'session') {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('User Logged In', {
      method,
      timestamp: new Date().toISOString()
    });
  }

  // Onboarding Events
  trackOnboardingStep(step: string, completed: boolean = true) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Onboarding Step', {
      step,
      completed,
      timestamp: new Date().toISOString()
    });
  }

  trackGmailConnection(success: boolean, permissions: string[] = []) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Gmail Connected', {
      success,
      permissions_granted: permissions,
      timestamp: new Date().toISOString()
    });

    if (success) {
      posthog.setPersonProperties({
        gmail_connected: true,
        gmail_connected_at: new Date().toISOString()
      });
    }
  }

  // Meeting Analysis Events
  trackMeetingUpload(properties: Partial<MeetingAnalysisEvent>) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Meeting Uploaded', {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackAnalysisStarted(sessionId: string, properties: Partial<MeetingAnalysisEvent> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Analysis Started', {
      session_id: sessionId,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackAnalysisCompleted(properties: MeetingAnalysisEvent) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Analysis Completed', {
      ...properties,
      timestamp: new Date().toISOString()
    });

    // Update user properties for first-time completion
    if (!posthog.getFeatureFlag('first_meeting_analyzed')) {
      posthog.setPersonProperties({
        first_meeting_analyzed: true,
        first_analysis_completed_at: new Date().toISOString()
      });
    }
  }

  trackAnalysisError(sessionId: string, error: string, step?: string) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Analysis Error', {
      session_id: sessionId,
      error,
      step,
      timestamp: new Date().toISOString()
    });
  }

  // Action Item Events
  trackActionItemCreated(properties: ActionItemEvent) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Action Item Created', {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackActionItemUpdated(actionItemId: string, changes: Record<string, any>) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Action Item Updated', {
      action_item_id: actionItemId,
      changes,
      timestamp: new Date().toISOString()
    });
  }

  trackActionItemCompleted(actionItemId: string, sessionId?: string) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Action Item Completed', {
      action_item_id: actionItemId,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
  }

  trackJiraPush(actionItemsCount: number, success: boolean, error?: string) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Jira Push', {
      items_count: actionItemsCount,
      success,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Feature Usage Events
  trackFeatureUsed(feature: string, properties: Partial<FeatureUsageEvent> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Feature Used', {
      feature,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackTabSwitch(fromTab: string, toTab: string, sessionId?: string) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Tab Switched', {
      from_tab: fromTab,
      to_tab: toTab,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
  }

  trackVisualizationInteraction(interactionType: string, sessionId: string, properties: Record<string, any> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Visualization Interaction', {
      interaction_type: interactionType,
      session_id: sessionId,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackPageView(page: string, properties: Record<string, any> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Session Events
  trackSessionStart() {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Session Started', {
      timestamp: new Date().toISOString()
    });
  }

  trackSessionEnd(durationSeconds: number) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Session Ended', {
      duration_seconds: durationSeconds,
      timestamp: new Date().toISOString()
    });
  }

  // Error Tracking
  trackError(error: Error, context?: Record<string, any>) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture('Error Occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // Custom Events
  track(eventName: string, properties: Record<string, any> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Group Analytics (for team/organization features)
  identifyGroup(groupType: string, groupKey: string, properties: Record<string, any> = {}) {
    if (!this.ensureInitialized()) return;
    
    posthog.group(groupType, groupKey, properties);
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export hook for React components
export const useAnalytics = () => analytics;
