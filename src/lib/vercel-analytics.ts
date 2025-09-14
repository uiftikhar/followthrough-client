import { track } from '@vercel/analytics';

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

class VercelAnalyticsService {
  private sessionStartTime: number | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    // Initialize session tracking
    if (typeof window !== 'undefined') {
      this.sessionStartTime = Date.now();
      this.currentSessionId = this.generateSessionId();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // User Lifecycle Events
  identifyUser(userId: string, properties: UserProperties = {}) {
    // Vercel Analytics doesn't have user identification like PostHog
    // We'll track this as a custom event instead
    this.track('user_identified', {
      user_id: userId,
      ...properties
    });
  }

  trackSignup(method: 'google' | 'email', properties: Record<string, any> = {}) {
    track('user_signup', {
      method,
      timestamp: new Date().toISOString(),
      ...properties
    });
  }

  trackLogin(method: 'google' | 'email' | 'session') {
    track('user_login', {
      method,
      timestamp: new Date().toISOString()
    });
  }

  // Onboarding Events
  trackOnboardingStep(step: string, completed: boolean = true) {
    track('onboarding_step', {
      step,
      completed,
      timestamp: new Date().toISOString()
    });
  }

  trackGmailConnection(success: boolean, permissions: string[] = []) {
    track('gmail_connected', {
      success,
      permissions_granted: permissions.join(','),
      timestamp: new Date().toISOString()
    });
  }

  // Meeting Analysis Events
  trackMeetingUpload(properties: Partial<MeetingAnalysisEvent>) {
    track('meeting_uploaded', {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackAnalysisStarted(sessionId: string, properties: Partial<MeetingAnalysisEvent> = {}) {
    track('analysis_started', {
      session_id: sessionId,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackAnalysisCompleted(properties: MeetingAnalysisEvent) {
    track('analysis_completed', {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackAnalysisError(sessionId: string, error: string, step?: string) {
    track('analysis_error', {
      session_id: sessionId,
      error,
      step: step || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  // Action Item Events
  trackActionItemCreated(properties: ActionItemEvent) {
    track('action_item_created', {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackActionItemUpdated(actionItemId: string, changes: Record<string, any>) {
    track('action_item_updated', {
      action_item_id: actionItemId,
      changes: JSON.stringify(changes),
      timestamp: new Date().toISOString()
    });
  }

  trackActionItemCompleted(actionItemId: string, sessionId?: string) {
    track('action_item_completed', {
      action_item_id: actionItemId,
      session_id: sessionId || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  trackJiraPush(actionItemsCount: number, success: boolean, error?: string) {
    track('jira_push', {
      items_count: actionItemsCount,
      success,
      error: error || 'none',
      timestamp: new Date().toISOString()
    });
  }

  // Feature Usage Events
  trackFeatureUsed(feature: string, properties: Partial<FeatureUsageEvent> = {}) {
    track('feature_used', {
      feature,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackTabSwitch(fromTab: string, toTab: string, sessionId?: string) {
    track('tab_switched', {
      from_tab: fromTab,
      to_tab: toTab,
      session_id: sessionId || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  trackVisualizationInteraction(interactionType: string, sessionId: string, properties: Record<string, any> = {}) {
    track('visualization_interaction', {
      interaction_type: interactionType,
      session_id: sessionId,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  trackPageView(page: string, properties: Record<string, any> = {}) {
    // Vercel Analytics automatically tracks page views, but we can add custom properties
    track('custom_page_view', {
      page,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Session Events
  trackSessionStart() {
    this.sessionStartTime = Date.now();
    this.currentSessionId = this.generateSessionId();
    
    track('session_started', {
      session_id: this.currentSessionId,
      timestamp: new Date().toISOString()
    });
  }

  trackSessionEnd(durationSeconds?: number) {
    const duration = durationSeconds || (this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0);
    
    track('session_ended', {
      session_id: this.currentSessionId,
      duration_seconds: duration,
      timestamp: new Date().toISOString()
    });
  }

  // Error Tracking
  trackError(error: Error, context?: Record<string, any>) {
    track('error_occurred', {
      error_message: error.message,
      error_name: error.name,
      context: context ? JSON.stringify(context) : 'none',
      timestamp: new Date().toISOString()
    });
  }

  // Custom Events
  track(eventName: string, properties: Record<string, any> = {}) {
    // Use Vercel's track function for custom events
    track(eventName, {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Button Clicks and UI Interactions
  trackButtonClick(buttonName: string, context?: string, properties?: Record<string, any>) {
    track('button_clicked', {
      button_name: buttonName,
      context: context || 'none',
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Conversion Events
  trackConversion(conversionType: string, value?: number, properties?: Record<string, any>) {
    track('conversion', {
      conversion_type: conversionType,
      value: value || 0,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Engagement Events
  trackEngagement(feature: string, duration: number, interactions: number) {
    track('user_engagement', {
      feature,
      duration_seconds: duration,
      interactions_count: interactions,
      timestamp: new Date().toISOString()
    });
  }

  // Business Metrics
  trackBusinessMetric(metricName: string, value: number, properties?: Record<string, any>) {
    track('business_metric', {
      metric_name: metricName,
      value,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: this.currentSessionId,
      sessionStartTime: this.sessionStartTime,
      sessionDuration: this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0
    };
  }
}

// Export singleton instance
export const analytics = new VercelAnalyticsService();

// Export hook for React components
export const useAnalytics = () => analytics;

// Export the track function directly for convenience
export { track };
