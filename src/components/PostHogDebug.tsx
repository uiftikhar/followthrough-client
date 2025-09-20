'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

export function PostHogDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testEventSent, setTestEventSent] = useState(false);

  useEffect(() => {
    const info = {
      posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      posthogLoaded: !!posthog.__loaded,
      posthogExists: typeof posthog !== 'undefined',
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    };

    setDebugInfo(info);

    console.log('=== PostHog Debug Info ===');
    console.log('PostHog Key:', info.posthogKey);
    console.log('PostHog Loaded:', info.posthogLoaded);
    console.log('PostHog Exists:', info.posthogExists);
    console.log('Current URL:', info.currentUrl);
    console.log('Config:', posthog.config);
    
    // Send test event
    if (posthog.__loaded) {
      posthog.capture('PostHog Debug Test Event', {
        debug: true,
        timestamp: new Date().toISOString(),
        page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        test_id: Math.random().toString(36).substr(2, 9)
      });
      
      setTestEventSent(true);
      console.log('✅ Debug test event sent to PostHog');
    } else {
      console.log('❌ PostHog not loaded - cannot send test event');
    }
  }, []);

  const sendManualTestEvent = () => {
    if (posthog.__loaded) {
      posthog.capture('Manual Test Event from Debug Component', {
        manual: true,
        timestamp: new Date().toISOString(),
        button_clicked: true
      });
      console.log('✅ Manual test event sent');
    } else {
      console.log('❌ PostHog not loaded');
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs z-50">
      <div className="font-bold mb-2">🔍 PostHog Debug</div>
      
      <div className="space-y-1 mb-3">
        <div>
          <strong>Key Set:</strong> {debugInfo.posthogKey ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Loaded:</strong> {debugInfo.posthogLoaded ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Test Event:</strong> {testEventSent ? '✅ Sent' : '❌ Failed'}
        </div>
      </div>

      <button
        onClick={sendManualTestEvent}
        className="bg-white text-blue-600 px-2 py-1 rounded text-xs font-medium hover:bg-gray-100"
      >
        Send Test Event
      </button>

      <div className="mt-2 pt-2 border-t border-blue-400">
        <div className="text-xs opacity-75">
          Check browser console for details
        </div>
      </div>
    </div>
  );
}
