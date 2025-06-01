# Agent Protocol API Integration

## Overview

This directory contains the implementation of the client-side integration with the Agent Protocol API for meeting analysis. The implementation follows the adapter pattern to maintain backward compatibility with the existing UI components while using the new Agent Protocol API endpoints.

## Components

- **AgentProtocolService**: Direct implementation of the Agent Protocol API endpoints
- **AgentProtocolAdapter**: Adapter that converts between the Agent Protocol API and the legacy API format
- **MeetingAnalysisService**: Service that now uses the AgentProtocolAdapter to maintain the same interface

## Architecture

```
+------------------------+     +------------------------+     +------------------------+
|                        |     |                        |     |                        |
|  UI Components         |---->|  MeetingAnalysisService|---->|  AgentProtocolAdapter |
|  (No changes needed)   |     |  (Updated to use       |     |  (Adapts legacy format|
|                        |     |   the adapter)         |     |   to Agent Protocol)  |
+------------------------+     +------------------------+     +-----------|------------+
                                                                          |
                                                              +-----------|------------+
                                                              |                        |
                                                              |  AgentProtocolService  |
                                                              |  (New API endpoints)   |
                                                              |                        |
                                                              +------------------------+
```

## How it Works

1. **UI Components** continue to use the `MeetingAnalysisService` with the same interface as before
2. The `MeetingAnalysisService` now delegates all calls to the `AgentProtocolAdapter`
3. The `AgentProtocolAdapter` adapts the requests and responses to work with the new Agent Protocol
4. The `AgentProtocolService` communicates directly with the Agent Protocol API endpoints

## API Differences

The main differences between the legacy API and the Agent Protocol API:

1. **Session Creation**: In the legacy API, sessions are created explicitly. In the Agent Protocol, we use meeting IDs directly.
2. **Analysis Flow**: The legacy API separates session creation and analysis. The Agent Protocol combines these in a single step.
3. **Status Checking**: The legacy API uses session IDs for status. The Agent Protocol requires both a meeting ID and an execution ID.
4. **Results Format**: The results format is different between the two APIs and requires mapping.

## Testing

You can test the Agent Protocol integration with:

```shell
node test-api-access.js
```

## Compatibility

This implementation maintains backward compatibility with all existing UI components while leveraging the improved features of the Agent Protocol API.

## Future Improvements

- Implement persistent storage of execution IDs for sessions
- Add support for streaming responses
- Add support for more advanced Agent Protocol features like tool execution 

# API Services

This directory contains all API service classes that communicate with the backend server.

## Centralized HTTP Client

All API services use the centralized `HttpClient` class located in `http-client.ts`. This provides:

- **Automatic ngrok header injection** for local development/testing
- **Consistent authentication** handling
- **Centralized error management**
- **Common request/response patterns**

### Usage

```typescript
import { HttpClient } from './http-client';

// GET request (authenticated by default)
const response = await HttpClient.get('/api/endpoint');
const data = await HttpClient.parseJsonResponse<ResponseType>(response);

// POST request with data
const response = await HttpClient.post('/api/endpoint', { key: 'value' });
const data = await HttpClient.parseJsonResponse<ResponseType>(response);

// DELETE request
const response = await HttpClient.delete('/api/endpoint');

// Public request (no authentication)
const response = await HttpClient.get('/api/public-endpoint', false);
```

### ngrok Header for Testing

During local development with ngrok, the HTTP client automatically adds the header:
```
ngrok-skip-browser-warning: any-value
```

This header is added in the `getCommonHeaders()` method and will be applied to **all** requests automatically.

**Note**: This header is for testing only and should be removed before production deployment.

## Centralized WebSocket Client

For real-time communication, we provide a centralized `WebSocketClient` class located in `websocket-client.ts`. This provides:

- **JWT authentication** for secure WebSocket connections
- **Automatic reconnection** with exponential backoff
- **Typed event handling** for all WebSocket events
- **Connection state management**
- **Event listener management**

### Usage

```typescript
import { getWebSocketClient, connectToEmailTriage } from './websocket-client';

// Get singleton WebSocket client
const client = getWebSocketClient({ debug: true });

// Connect and authenticate
await client.connect();

// Subscribe to events
client.subscribe({ userId: 'user123', emailAddress: 'user@gmail.com' });

// Listen for events
client.on('triage.completed', (data) => {
  console.log('Email triage completed:', data.result);
});

// Helper function for email triage
const client = await connectToEmailTriage('user123', 'user@gmail.com');
```

### WebSocket Event Types

The WebSocket client provides full TypeScript support for all event types:

**Client → Server Events:**
- `subscribe` - Subscribe to notifications
- `unsubscribe` - Unsubscribe from notifications  
- `status` - Request connection status
- `test` - Send test notification

**Server → Client Events:**
- `connected` - Connection established
- `subscribed` - Subscription confirmed
- `triage.started` - Email triage processing started
- `triage.completed` - Email triage completed with results
- `triage.failed` - Email triage failed
- `notification` - General system notifications

## Modular Gmail Services

The Gmail integration has been refactored into focused, modular services that eliminate duplication and provide clear separation of concerns:

### Architecture Overview

```
┌─────────────────────┐
│   useGmailTriage    │ ← React Hook (orchestrates all services)
│     (Hook)          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   GmailAuthService  │    │GmailNotifications   │    │  GmailTriageService │
│  • Login/logout     │    │     Service         │    │  • AI classification│
│  • JWT management   │    │  • Push notifications│    │  • Email analysis   │
│  • OAuth status     │    │  • Watch management │    │  • Result retrieval │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ GmailMessagesService│    │ GmailHealthService  │    │   WebSocketClient   │
│  • Get messages     │    │  • System health    │    │  • Real-time events │
│  • Send emails      │    │  • Statistics       │    │  • Auto-reconnect   │
│  • Search & filter  │    │  • Performance      │    │  • JWT auth         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 1. GmailAuthService

Handles authentication, OAuth, and JWT token management:

```typescript
import { GmailAuthService } from './gmail-auth-service';

// Login and get JWT token
const response = await GmailAuthService.login({ email, password });
GmailAuthService.setAuthToken(response.token);

// Check OAuth status
const status = await GmailAuthService.getOAuthStatus();

// JWT utilities
const userId = GmailAuthService.getUserIdFromToken();
const isAuth = GmailAuthService.isAuthenticated();
```

**Features:**
- User login/logout
- JWT token management (get, set, clear, validate)
- OAuth connection status
- User information extraction from tokens

### 2. GmailNotificationsService

Focused on Gmail push notifications management:

```typescript
import { GmailNotificationsService } from './gmail-notifications-service';

// Setup push notifications
await GmailNotificationsService.setupNotifications();

// Check notification status
const status = await GmailNotificationsService.getStatus();

// Manage watch renewal
await GmailNotificationsService.renewWatch();
```

**Features:**
- Push notification setup/disable
- Watch management and renewal
- Subscription management
- Notification status monitoring

### 3. GmailTriageService

Handles AI-powered email triage and classification:

```typescript
import { GmailTriageService } from './gmail-triage-service';

// Test email triage
const response = await GmailTriageService.testEmailTriage({
  subject: 'Bug Report',
  from: 'user@example.com',
  body: 'System is not working...'
});

// Get AI results
const result = await GmailTriageService.getTriageResult(sessionId);

// Batch processing
await GmailTriageService.batchTriage({ emails: [...] });
```

**Features:**
- AI email classification (priority, category, confidence)
- Automatic reply generation
- Batch processing
- Triage analytics and history
- Configuration management
- Validation utilities

### 4. GmailMessagesService

Handles Gmail message operations:

```typescript
import { GmailMessagesService } from './gmail-messages-service';

// Get messages
const messages = await GmailMessagesService.getUnreadMessages();

// Send email
await GmailMessagesService.sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Message content'
});

// Reply to message
await GmailMessagesService.replyToMessage(messageId, { body: 'Reply' });
```

**Features:**
- Message retrieval and filtering
- Email sending and replying
- Search and pagination
- Labels and profile management
- Utility methods (text extraction, metadata parsing)

### 5. GmailHealthService

System health monitoring and diagnostics:

```typescript
import { GmailHealthService } from './gmail-health-service';

// System health check
const health = await GmailHealthService.getSystemHealth();

// Performance metrics
const metrics = await GmailHealthService.getPerformanceMetrics();

// Check if attention needed
const attention = await GmailHealthService.needsAttention();
```

**Features:**
- Overall system health monitoring
- Watch and Pub/Sub health tracking
- Performance metrics and analytics
- Issue detection and recommendations
- Uptime and availability tracking

### Migration Benefits

**Before (3 services with duplication):**
- `gmail-triage-service.ts` (507 lines) - Everything mixed together
- `gmail-notifications-service.ts` (217 lines) - Overlapping functionality  
- `gmail-service.ts` (164 lines) - Basic message operations

**After (5 focused services):**
- `GmailAuthService` - Authentication only
- `GmailNotificationsService` - Notifications only  
- `GmailTriageService` - AI triage only
- `GmailMessagesService` - Message operations only
- `GmailHealthService` - Health monitoring only

**Improvements:**
- ✅ **No duplication** - Each service has a single responsibility
- ✅ **Better testability** - Smaller, focused units
- ✅ **Easier maintenance** - Clear boundaries between concerns
- ✅ **Improved reusability** - Services can be used independently
- ✅ **Better TypeScript support** - More specific types per service

### React Hook Integration

The `useGmailTriage` hook orchestrates all services and provides a unified interface:

```typescript
import { useGmailTriage } from '@/hooks/useGmailTriage';

const {
  // Auth state
  isAuthenticated,
  authStatus,
  
  // Operations
  login,
  setupNotifications,
  testEmailTriage,
  
  // Real-time data
  notifications,
  connectionState,
  
  // System health
  systemHealth
} = useGmailTriage({ debug: true });
```

### Demo Component

See `GmailTriageDemo.tsx` for a complete working example that demonstrates all services working together.

## Gmail Triage Production Integration

The Gmail triage system is production-ready and includes:

### Features
- **Real Gmail Push Notifications** via Google Cloud Pub/Sub
- **AI Email Classification** with priority, category, and confidence scoring
- **Automatic Reply Generation** with tone and next steps
- **Real-time WebSocket Updates** for triage progress and results
- **JWT Authentication** for secure API access
- **System Health Monitoring** with comprehensive diagnostics

### Production Endpoints

Base URL: `https://ffdf-2-201-41-78.ngrok-free.app`

**Authentication (Required for all Gmail endpoints):**
```
POST /auth/login
Authorization: Bearer JWT_TOKEN (for other endpoints)
```

**Gmail Push Notifications:**
```
GET  /gmail/client/auth-url        # Get OAuth URL
GET  /gmail/client/status          # Check OAuth/notification status  
POST /gmail/client/setup-notifications  # Enable push notifications
DELETE /gmail/client/disable-notifications  # Disable notifications
```

**Email Triage:**
```
POST /gmail/client/test-triage     # Test email classification
GET  /gmail/client/triage-result/:sessionId  # Get triage results
```

**System Health:**
```
GET /gmail/client/health           # Public health check
GET /gmail/client/statistics       # Detailed statistics (auth required)
```

### Integration Steps

1. **Install Dependencies:**
```bash
npm install socket.io-client
```

2. **Use the Hook:**
```typescript
import { useGmailTriage } from '@/hooks/useGmailTriage';

const triage = useGmailTriage({ debug: true });
```

3. **Implement the Flow:**
   - Login to get JWT token
   - Complete Google OAuth
   - Enable push notifications  
   - Connect to WebSocket for real-time updates
   - Test email triage
   - Receive AI classification results

4. **Handle Real-time Events:**
   - `triage.started` - Processing begins
   - `triage.completed` - Results available with classification, summary, and reply draft
   - `triage.failed` - Error occurred

The system provides a complete production-ready email triage solution with real Gmail integration, AI-powered classification, and real-time notifications.

## Current API Services

### Core Services (Using Centralized Client)

- `GmailAuthService` - **NEW** Gmail authentication and OAuth management
- `GmailNotificationsService` - Gmail push notifications (refactored)
- `GmailTriageService` - **NEW** AI email triage and classification (refactored)
- `GmailMessagesService` - **NEW** Gmail message operations (renamed from GmailService)
- `GmailHealthService` - **NEW** System health and monitoring
- `transcriptApi` - Transcript upload, management, and analysis
- `MeetingAnalysisService` - Meeting analysis sessions and results
- `chatApi` - Chat operations and transcript analysis
- `CalendarService` - Google Calendar event management
- `AuthService` - User authentication and token management  
- `GoogleOAuthService` - Google OAuth and connection management

### Components Using Centralized Client

- `useAgentProgress` - Agent progress tracking
- `AgentSystemMonitor` - Real-time system monitoring  
- `TranscriptProvider` - Transcript analysis operations
- `useGmailTriage` - **NEW** Gmail triage integration hook (refactored)

**All client-side network calls have been migrated to use the centralized HTTP client**, ensuring consistent header management and automatic ngrok header injection for testing. 