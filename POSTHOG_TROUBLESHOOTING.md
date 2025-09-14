# 🔍 PostHog Analytics Troubleshooting Guide

## 🚨 **Not Seeing Activity in PostHog Dashboard?**

Here's a step-by-step troubleshooting guide to fix your PostHog analytics:

## **1. ✅ Check Environment Variables**

### **In Vercel Dashboard:**
Go to your Vercel project → Settings → Environment Variables and verify:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_actual_key_here
```

**❌ Common Issues:**
- Missing `NEXT_PUBLIC_` prefix
- Wrong PostHog key
- Key not set in production environment

### **Verify Key Format:**
PostHog keys start with `phc_` followed by a long string:
```
✅ Correct: phc_abcd1234efgh5678ijkl9012mnop3456
❌ Wrong:   abcd1234efgh5678ijkl9012mnop3456
```

## **2. 🔍 Debug in Browser**

### **Open Browser Dev Tools:**
1. Go to your deployed site
2. Open Developer Tools (F12)
3. Check the **Console** tab for errors
4. Check the **Network** tab for PostHog requests

### **Expected Console Output:**
```javascript
// You should see PostHog initialization
PostHog: initialized
// And analytics events being sent
```

### **Expected Network Requests:**
Look for requests to:
- `https://eu.i.posthog.com/e/` (events)
- `https://eu.i.posthog.com/decide/` (feature flags)

## **3. 🧪 Test PostHog Integration**

Add this temporary test code to debug:

```typescript
// Add to any page component temporarily
useEffect(() => {
  console.log('PostHog Key:', process.env.NEXT_PUBLIC_POSTHOG_KEY);
  console.log('PostHog loaded:', typeof posthog !== 'undefined');
  
  // Send a test event
  if (typeof posthog !== 'undefined') {
    posthog.capture('Test Event', {
      test: true,
      timestamp: new Date().toISOString()
    });
    console.log('Test event sent');
  }
}, []);
```

## **4. 🔧 Common Fixes**

### **Fix #1: Environment Variable Not Set**
In Vercel:
1. Go to Project Settings → Environment Variables
2. Add: `NEXT_PUBLIC_POSTHOG_KEY` = `your_key_here`
3. **Redeploy** your application

### **Fix #2: Wrong PostHog Region**
Your config uses EU region. If your PostHog project is in US:

```typescript
// In src/providers/PostHogProvider.tsx, change:
ui_host: "https://app.posthog.com", // US region
api_host: "/ingest",
```

And update `next.config.ts`:
```typescript
// Change PostHog rewrites to US endpoints:
{
  source: "/ingest/static/:path*",
  destination: "https://us-assets.i.posthog.com/static/:path*",
},
{
  source: "/ingest/:path*", 
  destination: "https://us.i.posthog.com/:path*",
},
```

### **Fix #3: Ad Blockers**
PostHog might be blocked by ad blockers. Test in:
- Incognito/Private browsing
- Different browsers
- Disable ad blockers temporarily

### **Fix #4: CORS Issues**
If you see CORS errors, the PostHog proxy in `next.config.ts` should fix this. Verify the rewrites are working.

## **5. 🎯 Quick Verification Steps**

### **Step 1: Check PostHog Dashboard**
1. Go to [PostHog.com](https://posthog.com)
2. Login to your project
3. Go to "Live Events" tab
4. You should see events in real-time

### **Step 2: Trigger Test Events**
Visit your deployed site and:
1. Navigate between pages
2. Click buttons
3. Use features with analytics
4. Check PostHog "Live Events" immediately

### **Step 3: Browser Network Tab**
1. Open Dev Tools → Network
2. Filter by "posthog" or "ingest"
3. Navigate your site
4. Look for successful POST requests

## **6. 🔍 Debug PostHog Initialization**

Add this debug component temporarily:

```typescript
// Create: src/components/PostHogDebug.tsx
'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';

export function PostHogDebug() {
  useEffect(() => {
    console.log('=== PostHog Debug Info ===');
    console.log('Key:', process.env.NEXT_PUBLIC_POSTHOG_KEY);
    console.log('PostHog loaded:', !!posthog.__loaded);
    console.log('PostHog config:', posthog.config);
    
    // Send test event
    posthog.capture('Debug Test Event', {
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    });
    
    console.log('Test event sent');
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white p-2 text-xs">
      PostHog Debug Active
    </div>
  );
}
```

Add to your layout temporarily:
```typescript
import { PostHogDebug } from '@/components/PostHogDebug';

// In your layout:
{process.env.NODE_ENV === 'development' && <PostHogDebug />}
```

## **7. 🚀 Expected PostHog Events**

Once working, you should see these events in PostHog:

### **Automatic Events:**
- `$pageview` - Page visits
- `$pageleave` - Page exits  
- `$identify` - User identification

### **Custom Events (from your app):**
- `User Signed Up`
- `User Logged In`
- `Meeting Uploaded`
- `Analysis Completed`
- `Action Item Created`
- `Tab Switched`
- `Feature Used`

## **8. 🎯 Most Likely Issues & Solutions**

### **Issue #1: Missing Environment Variable (90% of cases)**
**Solution:** Set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel and redeploy

### **Issue #2: Wrong PostHog Region**
**Solution:** Check if your PostHog project is EU or US region and update config

### **Issue #3: Ad Blockers**
**Solution:** PostHog proxy should prevent this, but test without ad blockers

### **Issue #4: Caching Issues**
**Solution:** Hard refresh (Ctrl+F5) or clear browser cache

## **9. 🔍 Verification Commands**

Run these in browser console on your deployed site:

```javascript
// Check if PostHog is loaded
console.log('PostHog loaded:', typeof posthog !== 'undefined');

// Check PostHog config
console.log('PostHog config:', posthog.config);

// Send test event
posthog.capture('Manual Test Event', { test: true });

// Check recent events
console.log('PostHog queue:', posthog._requestQueue);
```

## **10. ✅ Success Indicators**

You'll know it's working when:

1. **Browser Console:** No PostHog errors
2. **Network Tab:** Successful requests to PostHog endpoints
3. **PostHog Dashboard:** Live events appearing
4. **PostHog Dashboard:** User count increasing
5. **PostHog Dashboard:** Page views being tracked

## **🆘 Still Not Working?**

If none of the above fixes work:

1. **Check PostHog Status:** [status.posthog.com](https://status.posthog.com)
2. **Verify PostHog Key:** Copy-paste exactly from PostHog dashboard
3. **Test Locally:** Run `npm run dev` and test analytics locally
4. **Check Browser:** Try different browsers/devices
5. **Contact Support:** PostHog has excellent support

## **📊 Expected Timeline**

Once fixed, you should see:
- **Immediate:** Events in PostHog "Live Events"
- **5-10 minutes:** Events in main dashboard
- **1 hour:** Full analytics data populated

Your analytics should start working immediately after fixing the environment variable issue! 🚀
