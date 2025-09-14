import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics';

export function useSessionTracking() {
  const analytics = useAnalytics();
  const sessionStartRef = useRef<number | null>(null);
  const hasTrackedSessionStart = useRef(false);

  useEffect(() => {
    // Track session start only once per component mount
    if (!hasTrackedSessionStart.current) {
      sessionStartRef.current = Date.now();
      analytics.trackSessionStart();
      hasTrackedSessionStart.current = true;
    }

    // Track session end on unmount or page unload
    const handleSessionEnd = () => {
      if (sessionStartRef.current) {
        const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        analytics.trackSessionEnd(durationSeconds);
      }
    };

    // Track when user leaves the page
    const handleBeforeUnload = () => {
      handleSessionEnd();
    };

    // Track when component unmounts (navigation within app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSessionEnd();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      handleSessionEnd();
    };
  }, [analytics]);

  return {
    trackCustomEvent: (eventName: string, properties?: Record<string, any>) => {
      analytics.track(eventName, properties);
    }
  };
}
