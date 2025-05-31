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

### API Services

Current API services using the centralized client:

- `GmailNotificationsService` - Gmail push notifications management
- `GoogleOAuthService` - Google OAuth and connection management
- `AuthService` - User authentication and token management  
- `transcriptApi` - Transcript upload, management, and analysis
- `MeetingAnalysisService` - Meeting analysis sessions and results
- `chatApi` - Chat operations and transcript analysis
- `GmailService` - Gmail message operations and sending
- `CalendarService` - Google Calendar event management
- `HealthService` - System health and status monitoring

**Client-side components and hooks using the centralized client:**
- `useAgentProgress` - Agent progress tracking
- `AgentSystemMonitor` - Real-time system monitoring  
- `TranscriptProvider` - Transcript analysis operations

**All client-side network calls have been migrated to use the centralized HTTP client**, ensuring consistent header management and automatic ngrok header injection for testing.

### Migration Guide

To migrate an existing API service to use the centralized client:

1. Import the `HttpClient`
2. Replace custom fetch calls with `HttpClient` methods
3. Use `HttpClient.parseJsonResponse()` for JSON parsing
4. Remove duplicate authentication and header logic

Example migration:
```typescript
// Before
const response = await fetch(`${API_BASE}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'any-value'
  }
});

// After
const response = await HttpClient.get('/endpoint');
const data = await HttpClient.parseJsonResponse<ResponseType>(response);
```

This ensures all requests include the ngrok header automatically and maintains consistency across all API services. 