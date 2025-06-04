/**
 * Authentication Service
 *
 * Handles authentication functionality, including login, logout, and token management
 */
import { API_CONFIG } from "../../config/api";

// Default user credentials
const DEFAULT_USER = {
  email: "abc@gmail.com",
  password: "temp123456",
  name: "Default User",
  role: "admin",
};

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Auth service for managing authentication
 */
export const AuthService = {
  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // For development purposes, we'll simulate a successful login with the default user
    if (
      credentials.email === DEFAULT_USER.email &&
      credentials.password === DEFAULT_USER.password
    ) {
      // Create a mock JWT token
      const token = this.generateMockToken();

      // Store in localStorage using consistent jwt_token key
      localStorage.setItem("jwt_token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "user-1",
          email: DEFAULT_USER.email,
          name: DEFAULT_USER.name,
          role: DEFAULT_USER.role,
        }),
      );

      return {
        token,
        user: {
          id: "user-1",
          email: DEFAULT_USER.email,
          name: DEFAULT_USER.name,
          role: DEFAULT_USER.role,
        },
      };
    }

    throw new Error("Invalid credentials");
  },

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user");
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem("jwt_token");
    if (!token) return false;

    try {
      // Basic JWT validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get current user
   */
  getCurrentUser(): {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null {
    const userJson = localStorage.getItem("user");
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  },

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem("jwt_token");
  },

  /**
   * Refresh token if needed
   */
  async refreshToken(): Promise<void> {
    // In a real app, this would call the server to refresh the token
    // For now, we'll just check if the current token is valid
    const token = this.getToken();
    if (!token) {
      throw new Error("No token to refresh");
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp <= currentTime) {
        // Token is expired, generate a new one for development
        const newToken = this.generateMockToken();
        localStorage.setItem("jwt_token", newToken);
      }
    } catch (error) {
      throw new Error("Invalid token format");
    }
  },

  /**
   * Generate a mock JWT token for development
   */
  generateMockToken(): string {
    // This is just a mock token for development
    // In production, you would get a real JWT from your server
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: "user-1",
        name: DEFAULT_USER.name,
        email: DEFAULT_USER.email,
        role: DEFAULT_USER.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      }),
    );
    const signature = btoa("mock-signature");

    return `${header}.${payload}.${signature}`;
  },
};
