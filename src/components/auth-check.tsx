"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthService } from "@/lib/api/auth-service";
import Cookies from "js-cookie";
import { usePathname, useRouter } from "next/navigation";

/**
 * Component that verifies authentication is properly synced between
 * localStorage and cookies. This ensures server components can access auth.
 */
export function AuthCheck() {
  const { isAuthenticated, user } = useAuth();
  const [synced, setSynced] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/register'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthPage = ['/auth/login', '/auth/register'].includes(pathname);

  useEffect(() => {
    const syncAuth = () => {
      // Check if authenticated according to context
      if (isAuthenticated) {
        // Check if token exists in localStorage but not in cookies
        const localToken = localStorage.getItem("auth_token");
        const cookieToken = Cookies.get("auth_token");

        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log("Auth Check - Local Storage Token:", !!localToken);
          console.log("Auth Check - Cookie Token:", !!cookieToken);
        }

        if (localToken && !cookieToken) {
          console.log("Syncing token from localStorage to cookies");
          // Re-sync token to cookies
          AuthService.setToken(localToken);
          setSynced(false);

          // Verify sync was successful
          setTimeout(() => {
            const cookieToken = Cookies.get("auth_token");
            if (process.env.NODE_ENV === 'development') {
              console.log("Auth Check - Cookie Token after sync:", !!cookieToken);
            }
            setSynced(!!cookieToken);
          }, 100);
        }
        
        // If on login/register page and authenticated, redirect to dashboard
        if (isAuthPage) {
          router.push('/dashboard');
        }
      } else {
        // If not authenticated but trying to access protected route, redirect to login
        if (!isPublicRoute) {
          // Let the middleware handle this redirection to avoid duplication
          // The middleware will store the callback URL
        }
      }
    };

    syncAuth();
  }, [isAuthenticated, isAuthPage, pathname, router]);

  // Periodic check to ensure auth is synced
  useEffect(() => {
    const interval = setInterval(() => {
      const localToken = localStorage.getItem("auth_token");
      const cookieToken = Cookies.get("auth_token");
      
      // If there's a mismatch, try to sync
      if ((localToken && !cookieToken) || (!localToken && cookieToken)) {
        if (localToken) {
          AuthService.setToken(localToken);
        } else if (cookieToken) {
          // If only cookie exists, sync back to localStorage
          localStorage.setItem("auth_token", cookieToken);
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything visible
  return null;
}
