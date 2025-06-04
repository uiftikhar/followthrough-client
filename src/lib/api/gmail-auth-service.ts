/**
 * Gmail Authentication Service
 *
 * Handles Gmail OAuth authentication, JWT token management, and auth state
 */

import { HttpClient } from "./http-client";

/**
 * Authentication DTOs
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  error?: string;
}

export interface OAuthStatus {
  isConnected: boolean;
  userInfo?: {
    googleUserId: string;
    googleEmail: string;
    googleName?: string;
    googlePicture?: string;
  };
}

export interface AuthStatusResponse {
  success: boolean;
  oauth: OAuthStatus;
  notifications: {
    isEnabled: boolean;
    watchInfo?: {
      watchId: string;
      historyId: string;
      expiresAt: string;
      isActive: boolean;
      googleEmail: string;
      notificationsReceived: number;
      emailsProcessed: number;
      errorCount: number;
      userId: string;
    };
  };
  system: {
    status: 'healthy' | 'unhealthy';
    pubsub: {
      connected: boolean;
      subscriptions: {
        pushSubscription: {
          exists: boolean;
        };
        pullSubscription: {
          exists: boolean;
        };
      };
    };
    watches: {
      totalActive: number;
      expiringSoon: number;
      withErrors: number;
      totalNotifications: number;
      totalEmailsProcessed: number;
    };
  };
  nextSteps: string[];
}

/**
 * Gmail Authentication Service
 */
export class GmailAuthService {
  /**
   * Authentication Methods
   */

  /**
   * Login to get JWT token
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Use public endpoint for login (no auth required)
      const response = await HttpClient.post("/auth/login", credentials, false);
      return await HttpClient.parseJsonResponse<LoginResponse>(response);
    } catch (error) {
      console.error("Failed to login:", error);
      throw error;
    }
  }

  /**
   * Get OAuth authorization URL
   */
  static async getAuthUrl(): Promise<{ authUrl: string }> {
    try {
      const response = await HttpClient.get("/gmail/client/auth-url");
      return await HttpClient.parseJsonResponse<{ authUrl: string }>(response);
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      throw error;
    }
  }

  /**
   * Check OAuth connection status
   */
  static async getOAuthStatus(): Promise<AuthStatusResponse> {
    try {
      const response = await HttpClient.get("/gmail/client/status");
      return await HttpClient.parseJsonResponse<AuthStatusResponse>(response);
    } catch (error) {
      console.error("Failed to get OAuth status:", error);
      throw error;
    }
  }

  /**
   * JWT Token Management
   */

  /**
   * Get user ID from JWT token
   */
  static getUserIdFromToken(): string | null {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("jwt_token");
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub || payload.userId || payload.id || null;
    } catch (error) {
      console.error("Failed to parse JWT token:", error);
      return null;
    }
  }

  /**
   * Get user email from JWT token
   */
  static getUserEmailFromToken(): string | null {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("jwt_token");
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.email || null;
    } catch (error) {
      console.error("Failed to parse JWT token:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("jwt_token");
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < exp;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get JWT token from storage
   */
  static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("jwt_token");
  }

  /**
   * Set JWT token in storage
   */
  static setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("jwt_token", token);
    }
  }

  /**
   * Clear authentication token
   */
  static clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("jwt_token");
    }
  }

  /**
   * Check if OAuth is connected
   */
  static async isOAuthConnected(): Promise<boolean> {
    try {
      const status = await this.getOAuthStatus();
      return status.oauth.isConnected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get authenticated user info
   */
  static async getUserInfo(): Promise<OAuthStatus["userInfo"] | null> {
    try {
      const status = await this.getOAuthStatus();
      return status.oauth.userInfo || null;
    } catch (error) {
      return null;
    }
  }
}
