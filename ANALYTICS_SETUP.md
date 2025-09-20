# PostHog Analytics Integration Guide

This guide explains how to use the PostHog analytics integration in the Followthrough Client application.

## 🚀 Setup Complete

The following has been implemented:

### ✅ Core Analytics Service
- **Location**: `src/lib/analytics.ts`
- **Features**: Centralized event tracking, user identification, error tracking
- **Usage**: Import `useAnalytics()` hook in any component

### ✅ PostHog Provider
- **Location**: `src/providers/PostHogProvider.tsx`
- **Configuration**: EU hosting, debug mode for development
- **Environment Variables**: Uses `NEXT_PUBLIC_POSTHOG_KEY`

### ✅ Session Tracking
- **Location**: `src/hooks/useSessionTracking.ts`
- **Features**: Automatic session start/end tracking, duration measurement

## 📊 Key Events Being Tracked

### User Lifecycle
```typescript
// User signup/login
analytics.trackSignup('google', { email: 'user@example.com' });
analytics.trackLogin('google');

// User identification
analytics.identifyUser('user123', {
  email: 'user@example.com',
  plan: 'free',
  signup_method: 'google'
});
```

### Meeting Analysis Workflow
```typescript
// Meeting upload
analytics.trackMeetingUpload({
  session_id: 'session-123',
  file_type: 'audio',
  duration_minutes: 45,
  upload_method: 'drag_drop'
});

// Analysis completion
analytics.trackAnalysisCompleted({
  session_id: 'session-123',
  topics_found: 5,
  action_items_found: 8,
  processing_time_seconds: 120,
  sentiment_analyzed: true,
  status: 'completed'
});
```

### Action Items Management
```typescript
// Action item creation
analytics.trackActionItemCreated({
  session_id: 'session-123',
  priority: 'high',
  assignee_set: true,
  has_acceptance_criteria: true,
  story_points: 5,
  source: 'meeting_analysis'
});

// Jira integration
analytics.trackJiraPush(3, true); // 3 items, success
```

### Feature Usage
```typescript
// Tab switches
analytics.trackTabSwitch('summary', 'action-items', 'session-123');

// Feature interactions
analytics.trackFeatureUsed('agent_visualization_viewed', {
  session_id: 'session-123'
});

// Visualization interactions
analytics.trackVisualizationInteraction('node_clicked', 'session-123', {
  node_type: 'action_item'
});
```

### Gmail Integration
```typescript
// Gmail connection
analytics.trackGmailConnection(true, ['read', 'send']);

// Onboarding steps
analytics.trackOnboardingStep('gmail_connected', true);
```

## 🎯 PostHog Dashboard Metrics

Based on [PostHog's pricing](https://posthog.com/) (1M events/month free), here are the key metrics you should track:

### Product Analytics Dashboard
1. **User Activation Funnel**
   - Sign up → Gmail Connected → First Meeting Analyzed
   - Track conversion rates at each step

2. **Feature Adoption**
   - Visualization usage rate
   - Action items creation rate
   - Jira integration usage

3. **User Engagement**
   - Session duration
   - Pages per session
   - Feature usage frequency

4. **Retention Metrics**
   - 7-day, 30-day retention rates
   - Churn prediction signals
   - Feature stickiness

### Business Metrics
1. **Conversion Tracking**
   - Free to paid conversion
   - Trial completion rates
   - Feature upgrade triggers

2. **User Journey Analysis**
   - Drop-off points in onboarding
   - Most used features
   - User flow optimization

## 🔧 Implementation in Components

### Basic Usage
```typescript
import { useAnalytics } from '@/lib/analytics';

function MyComponent() {
  const analytics = useAnalytics();
  
  const handleButtonClick = () => {
    analytics.trackFeatureUsed('button_clicked', {
      button_name: 'export_results'
    });
  };
  
  return <button onClick={handleButtonClick}>Export</button>;
}
```

### Advanced Usage with Custom Hooks
```typescript
import { useAuthAnalytics } from '@/lib/analytics-usage-examples';

function LoginForm() {
  const authAnalytics = useAuthAnalytics();
  
  const handleLogin = async (email: string) => {
    try {
      await login(email);
      authAnalytics.trackLogin('email', email);
    } catch (error) {
      analytics.trackError(error, { context: 'login_form' });
    }
  };
}
```

## 🔒 Privacy & Compliance

### GDPR Compliance
- PostHog is GDPR compliant when configured properly
- User consent should be obtained before tracking
- Data retention policies should be configured
- Users can request data deletion

### Data Minimization
```typescript
// ✅ Good - No PII in events
analytics.track('Meeting Analyzed', {
  duration_minutes: 45,
  topics_count: 5
});

// ❌ Bad - Contains PII
analytics.track('Meeting Analyzed', {
  participant_names: ['John Doe', 'Jane Smith'],
  meeting_content: 'Sensitive discussion...'
});
```

## 📈 Recommended PostHog Features

Based on your [PostHog setup](https://posthog.com/), leverage these features:

### 1. Session Replay (5k recordings/month free)
- Debug user issues
- Understand UX problems
- Optimize conversion funnels

### 2. Feature Flags (1M requests/month free)
- A/B test new features
- Gradual feature rollouts
- User segmentation

### 3. Data Warehouse Integration
- Connect with your existing data
- Advanced analytics queries
- Custom dashboards

## 🚨 Important Notes

1. **Environment Variables**: Ensure `NEXT_PUBLIC_POSTHOG_KEY` is set
2. **EU Hosting**: Currently configured for EU data residency
3. **Debug Mode**: Enabled in development, disabled in production
4. **Error Handling**: All analytics calls are wrapped with initialization checks
5. **Performance**: Analytics calls are non-blocking and won't affect UX

## 📊 Key Performance Indicators (KPIs)

Track these metrics in your PostHog dashboard:

### User Acquisition
- Sign-up conversion rate
- Traffic source effectiveness
- Cost per acquisition by channel

### User Activation
- Time to first value (first meeting analyzed)
- Onboarding completion rate
- Feature discovery rate

### User Engagement
- Daily/Weekly/Monthly active users
- Session duration and frequency
- Feature usage depth

### User Retention
- Cohort retention analysis
- Churn prediction and prevention
- Re-engagement campaign effectiveness

### Business Growth
- Revenue per user
- Feature upgrade conversion
- Customer lifetime value

## 🎯 Next Steps

1. **Set up PostHog dashboards** for these KPIs
2. **Configure alerts** for critical metrics
3. **Implement A/B tests** for key user flows
4. **Add session recordings** for UX optimization
5. **Create custom events** for business-specific metrics

Your analytics implementation is now ready to provide comprehensive insights into user behavior and business performance! 🚀
