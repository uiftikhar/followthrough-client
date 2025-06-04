# Google OAuth Setup Guide

This guide explains how to set up Google OAuth integration for Gmail, Calendar, and Meet access.

## Prerequisites

1. A Google Cloud Platform (GCP) project
2. Google APIs enabled for your project
3. OAuth 2.0 credentials configured

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - Google People API (for user info)

## Step 2: Configure OAuth 2.0

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://yourdomain.com/api/auth/google/callback`

## Step 3: Environment Variables

Add the following environment variables to your `.env.development` and `.env.production` files:

```bash
# Google OAuth Configuration
GOOGLE_AUTH_CLIENT_ID=your-google-client-id-here
GOOGLE_AUTH_CLIENT_SECRET=your-google-client-secret-here
NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID=your-google-client-id-here

# NextAuth URL (required for OAuth callback)
NEXTAUTH_URL=http://localhost:3000  # or your production URL
```

## Step 4: OAuth Scopes

The application requests the following Google OAuth scopes:

- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
- `https://www.googleapis.com/auth/gmail.send` - Send emails via Gmail
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events` - Manage calendar events
- `https://www.googleapis.com/auth/userinfo.email` - Access user email
- `https://www.googleapis.com/auth/userinfo.profile` - Access user profile

## Step 5: Testing

1. Start your development server
2. Navigate to the dashboard
3. Click "Authorize Google Access"
4. Complete the OAuth flow
5. Verify the connection is successful

## Security Notes

- Store client secrets securely and never expose them in client-side code
- Use HTTPS in production
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console
- Implement proper token refresh logic for long-lived access

## Troubleshooting

### Common Issues

1. **Redirect URI mismatch**: Ensure the redirect URI in Google Cloud Console matches exactly
2. **Invalid client**: Check that your client ID and secret are correct
3. **Scope errors**: Verify all required APIs are enabled in Google Cloud Console
4. **CORS issues**: Ensure your domain is properly configured in Google Cloud Console

### Error Messages

- `access_denied`: User denied authorization
- `invalid_request`: Check OAuth parameters
- `unauthorized_client`: Verify client ID and secret
- `unsupported_response_type`: Should be 'code' for authorization code flow

## Next Steps

After successful OAuth setup, you can:

1. Implement Gmail integration for email analysis
2. Add Calendar integration for meeting scheduling
3. Build Google Meet integration via Calendar API
4. Store and manage user tokens securely
5. Implement token refresh logic

## API Integration Examples

Once authorized, you can use the Google APIs:

```typescript
// Example: List Gmail messages
const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Example: List Calendar events
const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
``` 