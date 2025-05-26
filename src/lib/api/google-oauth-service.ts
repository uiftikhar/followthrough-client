/**
 * Google OAuth Service (Client-Side)
 * 
 * Handles Google OAuth integration through our NestJS server
 * All sensitive operations are performed server-side for security
 */

import { AuthService } from './auth-service';

export interface GoogleConnectionStatus {
  isConnected: boolean;
  googleEmail?: string;
  expiresAt?: string;
  needsRefresh?: boolean;
  userInfo?: {
    googleEmail: string;
    googleName?: string;
    googleId: string;
  };
}

export interface GoogleTestResult {
  success: boolean;
  message: string;
  isConnected: boolean;
  testResult?: {
    email: string;
    name: string;
    verified: boolean;
  };
  error?: string;
}

export class GoogleOAuthService {
  private static readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  /**
   * Get the JWT token from localStorage
   */
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Make authenticated request to server
   */
  private static async makeAuthenticatedRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in first.');
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log("********************* GOOGLE AUTH *********************", response)
    // If we get 401, try to refresh the token automatically
    if (response.status === 401) {
      console.log('🔄 Token expired, attempting automatic refresh...');
      
      try {
        await AuthService.refreshToken();
        console.log('✅ Token refresh successful, retrying request...');
        
        // Retry the request with the new token
        const newToken = this.getAuthToken();
        return fetch(`${this.API_BASE}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        throw new Error('Authentication expired and refresh failed. Please log in again.');
      }
    }

    return response;
  }

  /**
   * Initiate Google OAuth flow by getting authorization URL from server
   */
  static async initiateGoogleOAuth(): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest('/oauth/google/authorize');
      console.log("********************* GOOGLE AUTH *********************", response)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.authUrl) {
        throw new Error('Failed to get authorization URL from server');
      }

      // Redirect to Google OAuth (server-generated URL)
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Failed to initiate Google OAuth:', error);
      throw error;
    }
  }

  /**
   * Get Google connection status from server
   */
  static async getGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
    try {
      const response = await this.makeAuthenticatedRequest('/oauth/google/status');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        isConnected: data.isConnected || false,
        googleEmail: data.userInfo?.googleEmail,
        expiresAt: data.expiresAt,
        needsRefresh: data.needsRefresh || false,
        userInfo: data.userInfo,
      };
      
    } catch (error) {
      console.error('Failed to get Google connection status:', error);
      throw error;
    }
  }

  /**
   * Revoke Google access through server
   */
  static async revokeGoogleAccess(): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('/oauth/google/revoke', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to revoke access: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;
      
    } catch (error) {
      console.error('Failed to revoke Google access:', error);
      throw error;
    }
  }

  /**
   * Test Google connection through server
   */
  static async testGoogleConnection(): Promise<GoogleTestResult> {
    try {
      const response = await this.makeAuthenticatedRequest('/oauth/google/test');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || `Test failed: ${response.status}`,
          isConnected: false,
          error: errorData.error,
        };
      }

      const data = await response.json();
      return data as GoogleTestResult;
      
    } catch (error) {
      console.error('Failed to test Google connection:', error);
      return {
        success: false,
        message: 'Connection test failed',
        isConnected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Manually refresh tokens through server
   */
  static async refreshTokens(): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('/oauth/google/refresh', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to refresh tokens: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;
      
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated (has valid JWT token)
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = this.getAuthToken();
    
    if (!token) {
      return false;
    }
    
    try {
      // Basic JWT validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > currentTime;
      
      // If token is expired, try to refresh it automatically
      if (!isValid) {
        console.log('🔄 Token expired, attempting automatic refresh...');
        
        try {
          await AuthService.refreshToken();
          console.log('✅ Token refresh successful');
          return true; // Token was successfully refreshed
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          return false; // Refresh failed, user needs to log in again
        }
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ Token parsing failed:', error);
      return false;
    }
  }
} 