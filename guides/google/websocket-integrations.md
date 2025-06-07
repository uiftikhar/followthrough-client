# Smart Gmail Watch Setup Guide

## 🎯 **Problem**: Duplicate Watch Creation

Clients are calling `setup-notifications` repeatedly without checking if a watch already exists, leading to:
- Unnecessary API calls
- Potential quota usage
- Confusion about watch status
- Server log noise

## ✅ **Solution**: Smart Watch Detection

Use the **status endpoint first** to check if a watch already exists before attempting to create one.

## 🔧 **Smart Implementation Pattern**

### **1. Check Status First** 

```javascript
async function smartSetupGmailNotifications(jwtToken) {
  try {
    // STEP 1: Check current status
    console.log('🔍 Checking current Gmail watch status...');
    
    const statusResponse = await fetch('https://followthrough-server-production.up.railway.app/gmail/client/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const status = await statusResponse.json();
    
    if (!status.success) {
      throw new Error('Failed to check status');
    }
    
    console.log('📊 Current status:', status.status);
    
    // STEP 2: Analyze status and decide action
    const needsSetup = analyzeStatus(status.status);
    
    if (!needsSetup.required) {
      console.log('✅ Gmail notifications already configured properly');
      return {
        success: true,
        action: 'already_configured',
        status: status.status,
        message: needsSetup.message
      };
    }
    
    // STEP 3: Setup only if needed
    console.log('🚀 Setting up Gmail notifications...');
    console.log('📝 Reason:', needsSetup.reason);
    
    const setupResponse = await fetch('https://followthrough-server-production.up.railway.app/gmail/client/setup-notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const setupResult = await setupResponse.json();
    
    if (setupResult.success) {
      console.log('✅ Gmail notifications setup completed');
      return {
        success: true,
        action: 'setup_completed',
        result: setupResult,
        previousStatus: status.status
      };
    } else {
      throw new Error(`Setup failed: ${setupResult.message}`);
    }
    
  } catch (error) {
    console.error('❌ Smart setup failed:', error);
    return {
      success: false,
      error: error.message,
      action: 'failed'
    };
  }
}

// Analyze status to determine if setup is needed
function analyzeStatus(status) {
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
}
```

### **2. React Hook Implementation**

```javascript
import { useState, useEffect, useCallback } from 'react';

export function useGmailWatchSetup(jwtToken) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Check current status
  const checkStatus = useCallback(async () => {
    if (!jwtToken) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://followthrough-server-production.up.railway.app/gmail/client/status', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      
      const result = await response.json();
      setStatus(result.success ? result.status : null);
      
      if (!result.success) {
        setError('Failed to check status');
      }
      
    } catch (err) {
      setError(err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [jwtToken]);
  
  // Smart setup function
  const setupIfNeeded = useCallback(async () => {
    if (!status) {
      await checkStatus();
      return;
    }
    
    const needsSetup = analyzeStatus(status);
    
    if (!needsSetup.required) {
      console.log('✅ Setup not needed:', needsSetup.message);
      return { success: true, action: 'not_needed', message: needsSetup.message };
    }
    
    try {
      setLoading(true);
      console.log('🚀 Setting up Gmail watch:', needsSetup.reason);
      
      const response = await fetch('https://followthrough-server-production.up.railway.app/gmail/client/setup-notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh status after successful setup
        await checkStatus();
        return { success: true, action: 'setup_completed', result };
      } else {
        setError(result.message);
        return { success: false, error: result.message };
      }
      
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [status, jwtToken, checkStatus]);
  
  // Auto-check status on mount and token change
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);
  
  return {
    status,
    loading,
    error,
    checkStatus,
    setupIfNeeded,
    isWatchActive: status?.gmail?.watchActive || false,
    needsOAuth: !status?.user?.isConnectedToGoogle,
    accountsMatch: status?.gmail?.accountsMatch
  };
}
```

### **3. Vue.js Composition API**

```javascript
import { ref, computed, onMounted } from 'vue';

export function useGmailWatchSetup(jwtToken) {
  const status = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  const isWatchActive = computed(() => status.value?.gmail?.watchActive || false);
  const needsOAuth = computed(() => !status.value?.user?.isConnectedToGoogle);
  const accountsMatch = computed(() => status.value?.gmail?.accountsMatch);
  
  async function checkStatus() {
    if (!jwtToken.value) return;
    
    try {
      loading.value = true;
      error.value = null;
      
      const response = await fetch('https://followthrough-server-production.up.railway.app/gmail/client/status', {
        headers: { 'Authorization': `Bearer ${jwtToken.value}` }
      });
      
      const result = await response.json();
      status.value = result.success ? result.status : null;
      
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }
  
  async function setupIfNeeded() {
    if (!status.value) {
      await checkStatus();
      return;
    }
    
    const needsSetup = analyzeStatus(status.value);
    
    if (!needsSetup.required) {
      return { success: true, action: 'not_needed' };
    }
    
    // Perform setup...
    // (same logic as React version)
  }
  
  onMounted(() => {
    checkStatus();
  });
  
  return {
    status,
    loading,
    error,
    checkStatus,
    setupIfNeeded,
    isWatchActive,
    needsOAuth,
    accountsMatch
  };
}
```

## 📊 **Status Response Structure**

The `/gmail/client/status` endpoint returns comprehensive information:

```typescript
interface StatusResponse {
  success: boolean;
  status: {
    user: {
      userId: string;
      isConnectedToGoogle: boolean;
      authenticationStatus: 'not_connected' | 'connected' | 'auth_failed';
    };
    gmail: {
      authenticatedAs: string | null;        // Current Gmail account
      monitoringAccount: string | null;      // Gmail account being watched
      accountsMatch: boolean;                // Do they match?
      watchActive: boolean;                  // Is watch active?
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
```

## 🎯 **Decision Logic**

| User Auth | Watch Active | Accounts Match | Action |
|-----------|--------------|----------------|---------|
| ❌ Not connected | N/A | N/A | **Show OAuth button** |
| ⚠️ Auth failed | N/A | N/A | **Refresh OAuth** |
| ✅ Connected | ✅ Active | ✅ Match | **No action needed** |
| ✅ Connected | ✅ Active | ❌ Mismatch | **Setup new watch** |
| ✅ Connected | ❌ Inactive | N/A | **Setup new watch** |

## 🚀 **Complete Integration Example**

```javascript
class GmailNotificationManager {
  constructor(apiBaseUrl, getJwtToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.getJwtToken = getJwtToken;
    this.status = null;
  }
  
  async initialize() {
    console.log('🔄 Initializing Gmail notification manager...');
    
    // Check current status
    await this.checkStatus();
    
    if (!this.status) {
      throw new Error('Failed to get status');
    }
    
    // Auto-setup if needed and possible
    const setupResult = await this.ensureProperSetup();
    
    console.log('✅ Gmail notification manager ready');
    return setupResult;
  }
  
  async checkStatus() {
    const token = await this.getJwtToken();
    if (!token) {
      throw new Error('No JWT token available');
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/gmail/client/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      this.status = result.success ? result.status : null;
      return this.status;
      
    } catch (error) {
      console.error('❌ Status check failed:', error);
      this.status = null;
      throw error;
    }
  }
  
  async ensureProperSetup() {
    if (!this.status) {
      throw new Error('Status not available - call checkStatus() first');
    }
    
    // Check if OAuth is needed
    if (!this.status.user.isConnectedToGoogle) {
      return {
        success: false,
        action: 'oauth_required',
        message: 'Complete OAuth authentication first',
        authUrl: `${this.apiBaseUrl}/gmail/client/auth-url`
      };
    }
    
    // Check if watch setup is needed
    const needsSetup = analyzeStatus(this.status);
    
    if (!needsSetup.required) {
      return {
        success: true,
        action: 'already_configured',
        message: needsSetup.message,
        watchInfo: this.status.gmail.watchDetails
      };
    }
    
    // Perform setup
    return await this.setupNotifications();
  }
  
  async setupNotifications() {
    const token = await this.getJwtToken();
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/gmail/client/setup-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh status
        await this.checkStatus();
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }
  
  // Public getters
  get isReady() {
    return this.status?.health?.overall === 'healthy';
  }
  
  get watchActive() {
    return this.status?.gmail?.watchActive || false;
  }
  
  get needsOAuth() {
    return !this.status?.user?.isConnectedToGoogle;
  }
}

// Usage
const gmailManager = new GmailNotificationManager(
  'https://followthrough-server-production.up.railway.app',
  () => localStorage.getItem('jwtToken')
);

await gmailManager.initialize();

if (gmailManager.isReady) {
  console.log('🎉 Gmail notifications are ready!');
} else if (gmailManager.needsOAuth) {
  console.log('🔑 OAuth required');
  // Redirect to OAuth
} else {
  console.log('⚠️ Setup issues detected');
  // Handle other issues
}
```

## 🔧 **For Your Current Issue**

Based on your logs, user `6843dac182ba15ed11ff9c2f` completed OAuth but **no watch was created**. Here's what should happen:

1. **Client should check status**:
```bash
curl -X GET "https://followthrough-server-production.up.railway.app/gmail/client/status" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

2. **Status will show**: `watchActive: false`

3. **Client should then call**:
```bash
curl -X POST "https://followthrough-server-production.up.railway.app/gmail/client/setup-notifications" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

4. **Watch will be created** and push notifications will start working!

The client should **never** call `setup-notifications` without first checking the status. This prevents duplicate watches and unnecessary API calls. 