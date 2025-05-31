/**
 * Google OAuth Service (Client-Side)
 * 
 * Handles Google OAuth integration through our NestJS server
 * All sensitive operations are performed server-side for security
 */

import { HttpClient } from './http-client';
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
  /**
   * Make authenticated request with automatic token refresh for Google OAuth
   */
  private static async makeAuthenticatedRequestWithRefresh(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    try {
      // Try the normal authenticated request first
      return await HttpClient.authenticatedRequest(endpoint, options);
    } catch (error) {
      // If it's an auth error, try to refresh the token
      if (error instanceof Error && error.message.includes('Authentication expired')) {
        console.log('🔄 Token expired, attempting automatic refresh...');
        
        try {
          await AuthService.refreshToken();
          console.log('✅ Token refresh successful, retrying request...');
          
          // Retry the request with the new token
          return await HttpClient.authenticatedRequest(endpoint, options);
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Authentication expired and refresh failed. Please log in again.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Initiate Google OAuth flow by getting authorization URL from server
   */
  static async initiateGoogleOAuth(): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequestWithRefresh('/oauth/google/authorize');
      console.log("********************* GOOGLE AUTH *********************", response)
      
      const data = await HttpClient.parseJsonResponse<{ success: boolean; authUrl: string }>(response);
      
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
      const response = await this.makeAuthenticatedRequestWithRefresh('/oauth/google/status');
      const data = await HttpClient.parseJsonResponse<{
        isConnected: boolean;
        expiresAt?: string;
        needsRefresh?: boolean;
        userInfo?: {
          googleEmail: string;
          googleName?: string;
          googleId: string;
        };
      }>(response);
      
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
      const response = await this.makeAuthenticatedRequestWithRefresh('/oauth/google/revoke', {
        method: 'DELETE',
      });
      
      const data = await HttpClient.parseJsonResponse<{ success: boolean }>(response);
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
      const response = await this.makeAuthenticatedRequestWithRefresh('/oauth/google/test');
      return await HttpClient.parseJsonResponse<GoogleTestResult>(response);
      
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
      const response = await this.makeAuthenticatedRequestWithRefresh('/oauth/google/refresh', {
        method: 'POST',
      });
      
      const data = await HttpClient.parseJsonResponse<{ success: boolean }>(response);
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
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