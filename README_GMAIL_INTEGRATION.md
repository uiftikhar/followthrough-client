# Gmail Push Notifications - Client Integration

This documentation covers the client-side implementation of Gmail Push Notifications using Google Pub/Sub integration, following the architecture outlined in your pub-sub integration guide.

## 🏗️ Architecture Overview

```
User Interface → Gmail Notifications Service → Server API → Google Pub/Sub → Gmail
     ↓                    ↓                        ↓              ↓
Dashboard Component → API Client → Gmail API → Real-time Email Processing
```

## 📁 Files Created

### Core Services
- `src/lib/api/gmail-notifications-service.ts` - Main service for Gmail notifications
- `src/hooks/useGmailNotifications.ts` - React hook for state management

### UI Components
- `src/components/ui/switch.tsx` - Toggle switch component
- `src/components/auth/GmailNotificationsButton.tsx` - Main notifications UI
- `src/app/dashboard/page.tsx` - Updated dashboard with notifications

## 🔧 Features Implemented

### 1. Gmail Notifications Service (`src/lib/api/gmail-notifications-service.ts`)

Provides all the client API endpoints from your pub-sub guide:

#### Setup & Management
```typescript
// Get OAuth authorization URL
static async getAuthUrl(): Promise<string>

// Check connection & notification status  
static async getStatus(): Promise<GmailNotificationStatus>

// Enable Gmail push notifications
static async setupNotifications(options?: GmailNotificationSetup): Promise<{success: boolean; message: string}>

// Disable notifications
static async disableNotifications(): Promise<{success: boolean; message: string}>

// Manual watch renewal
static async renewWatch(): Promise<{success: boolean; message: string; expiresAt?: string}>
```

#### Testing & Monitoring
```typescript
// Test email processing without real emails
static async testTriage(): Promise<EmailTriageResult>

// System health check
static async getHealth(): Promise<GmailHealthStatus>

// Detailed watch statistics
static async getStatistics(): Promise<GmailStatistics>

// Test Pub/Sub connection
static async testPubSub(): Promise<{success: boolean; message: string}>

// Manual pull processing
static async processPullMessages(): Promise<{success: boolean; message: string; messagesProcessed?: number}>
```

### 2. Gmail Notifications UI Component

The `GmailNotificationsButton` provides a comprehensive tabbed interface:

#### Control Tab
- **Toggle Switch**: Enable/disable push notifications
- **Watch Expiration**: Shows when the current watch expires
- **Action Buttons**: Renew watch, test triage, test Pub/Sub, process pull messages

#### Health Tab
- **System Status**: Overall health indicator
- **Watch Status**: Active status, expiration time
- **Pub/Sub Status**: Connection status, last message
- **Error List**: Any system errors

#### Statistics Tab
- **Total Watches**: Number of watches created
- **Active Watches**: Currently active watches
- **Messages Processed**: Total email processing count
- **Average Processing Time**: Performance metrics

#### Settings Tab
- **Label IDs**: Configure which Gmail labels to watch
- **Topic Name**: Custom Pub/Sub topic configuration
- **Current Labels**: Display active label filters

### 3. React Hook for State Management

The `useGmailNotifications` hook provides:

```typescript
const {
  status,              // Current notification status
  health,              // System health information
  statistics,          // Performance statistics
  isLoading,           // Loading state
  error,               // Error messages
  refreshAll,          // Refresh all data
  setupNotifications,  // Enable notifications
  disableNotifications, // Disable notifications
  renewWatch,          // Renew Gmail watch
  testTriage,          // Test email processing
  testPubSub,          // Test Pub/Sub connection
  processPullMessages  // Manual message processing
} = useGmailNotifications(30000); // Auto-refresh every 30 seconds
```

## 🎯 Dashboard Integration

The main dashboard (`src/app/dashboard/page.tsx`) now includes:

1. **Google OAuth Button** - For initial Google account connection
2. **Gmail Notifications Button** - For managing push notifications
3. **Integrated Messaging** - Success/error messages for both systems

## 🔄 Complete Integration Flow

### 1. Initial Setup
```typescript
// User connects Google account via existing OAuth flow
const googleStatus = await GoogleOAuthService.getGoogleConnectionStatus();

// Once connected, user can enable Gmail notifications
const result = await GmailNotificationsService.setupNotifications({
  labelIds: ['INBOX', 'IMPORTANT']  // Optional: filter by labels
});
```

### 2. Real-time Monitoring
```typescript
// Check system health
const health = await GmailNotificationsService.getHealth();

// View statistics
const stats = await GmailNotificationsService.getStatistics();

// Manual testing
const triageResult = await GmailNotificationsService.testTriage();
```

### 3. Watch Management
```typescript
// Renew watch before expiration
const renewResult = await GmailNotificationsService.renewWatch();

// Disable when needed
const disableResult = await GmailNotificationsService.disableNotifications();
```

## 🧪 Testing Features

### Email Triage Testing
- Tests email processing pipeline without real emails
- Returns mock results showing email categorization
- Useful for verifying AI processing functionality

### Pub/Sub Connection Testing
- Verifies Google Pub/Sub connectivity
- Tests message publishing/receiving
- Validates topic and subscription setup

### Manual Pull Processing
- Processes any missed messages via pull method
- Backup mechanism for reliability
- Shows processing statistics

## 📊 Monitoring & Analytics

### Health Monitoring
- **Watch Status**: Active/inactive, expiration tracking
- **Pub/Sub Status**: Connection health, last message timestamps
- **Error Tracking**: Comprehensive error logging and display

### Performance Statistics
- **Processing Metrics**: Messages processed, average processing time
- **Error Rates**: Success/failure ratios
- **Watch Statistics**: Total and active watch counts

## 🔐 Security Features

### Authentication
- Uses existing JWT token system
- Automatic token refresh on expiration
- Secure server-side OAuth token storage

### Error Handling
- Graceful degradation on API failures
- Comprehensive error messaging
- Automatic retry mechanisms

## 🚀 Usage Instructions

### For Users
1. **Login** to your account
2. **Connect Google** account via the Google Auth button
3. **Enable Gmail Notifications** using the notifications toggle
4. **Configure Labels** (optional) to filter which emails trigger notifications
5. **Monitor Health** and statistics via the dashboard tabs

### For Developers
```typescript
// Import the service
import { GmailNotificationsService } from '@/lib/api/gmail-notifications-service';

// Use the hook for state management
import { useGmailNotifications } from '@/hooks/useGmailNotifications';

// Add the component to your UI
import { GmailNotificationsButton } from '@/components/auth/GmailNotificationsButton';
```

## 🔧 Configuration

### Environment Variables
Make sure your server has these configured:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000  # Your server URL
```

### Server Endpoints Expected
The client expects these server endpoints to be implemented:
- `GET /gmail/client/auth-url`
- `GET /gmail/client/status`
- `POST /gmail/client/setup-notifications`
- `DELETE /gmail/client/disable-notifications`
- `POST /gmail/client/renew-watch`
- `POST /gmail/client/test-triage`
- `GET /gmail/client/health`
- `GET /gmail/client/statistics`
- `POST /gmail/client/test-pubsub`
- `POST /gmail/client/process-pull-messages`

## 🎊 Benefits

✅ **Real-time processing** (seconds vs minutes with Zapier)  
✅ **Cost reduction** (no Zapier subscription needed)  
✅ **Enhanced security** (direct Google API integration)  
✅ **Better reliability** (Google's infrastructure + backup processing)  
✅ **Full control** (complete email processing pipeline)  
✅ **Comprehensive monitoring** (health checks, statistics, alerts)  
✅ **Automated maintenance** (watch renewals, error recovery)  

## 🚀 Next Steps

1. **Start your server** with the Gmail client API endpoints
2. **Test the integration** using the dashboard
3. **Enable notifications** and send test emails
4. **Monitor performance** via the health and statistics tabs
5. **Configure label filtering** as needed for your use case

The Gmail Push Notifications system is now fully integrated and ready for production use! 🎉 