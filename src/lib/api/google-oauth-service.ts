/**
 * Google OAuth Service (Client-Side)
 *
 * Handles Google OAuth integration through our NestJS server
 * All sensitive operations are performed server-side for security
 */

import { HttpClient } from "./http-client";
import { AuthService } from "./auth-service";
import { WatchInfo } from "./gmail-notifications-service";

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
   * Initiate Google OAuth flow by getting authorization URL from server
   */
  static async initiateGoogleOAuth(): Promise<void> {
    try {
      const response = await HttpClient.get("/oauth/google/authorize");
      console.log(
        "********************* GOOGLE AUTH *********************",
        response,
      );

      const data = await HttpClient.parseJsonResponse<{
        success: boolean;
        authUrl: string;
      }>(response);

      if (!data.success || !data.authUrl) {
        throw new Error("Failed to get authorization URL from server");
      }

      
      // Redirect to Google OAuth (server-generated URL)
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Failed to initiate Google OAuth:", error);
      throw error;
    }
  }

  /**
   * Get Google connection status from server
   */
  static async getGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
    try {
      const response = await HttpClient.get("/oauth/google/status");
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
      console.error("Failed to get Google connection status:", error);
      throw error;
    }
  }

  /**
   * Revoke Google access through server
   */
  static async revokeGoogleAccess(): Promise<boolean> {
    try {
      const response = await HttpClient.delete("/oauth/google/revoke");

      const data = await HttpClient.parseJsonResponse<{ success: boolean }>(
        response,
      );
      return data.success || false;
    } catch (error) {
      console.error("Failed to revoke Google access:", error);
      throw error;
    }
  }

  /**
   * Test Google connection through server
   */
  static async testGoogleConnection(): Promise<GoogleTestResult> {
    try {
      const response = await HttpClient.get("/oauth/google/test");
      return await HttpClient.parseJsonResponse<GoogleTestResult>(response);
    } catch (error) {
      console.error("Failed to test Google connection:", error);
      return {
        success: false,
        message: "Connection test failed",
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
      const response = await HttpClient.post("/oauth/google/refresh", {});

      const data = await HttpClient.parseJsonResponse<{ success: boolean }>(
        response,
      );
      return data.success || false;
    } catch (error) {
      console.error("Failed to refresh tokens:", error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated (has valid JWT token)
   */
  static async isAuthenticated(): Promise<boolean> {
    return AuthService.isAuthenticated();
  }
}
