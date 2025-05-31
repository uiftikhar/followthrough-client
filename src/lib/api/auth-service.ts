import { HttpClient } from "./http-client";
import Cookies from "js-cookie";
import { API_CONFIG } from "@/config/api";

// Cookie settings for better security
const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  expires: 7, // 7 days
  path: "/",
};

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log("Attempting login with centralized HTTP client");
      const response = await HttpClient.post('/auth/login', credentials, false);
      const data = await HttpClient.parseJsonResponse<AuthResponse>(response);

      // Store tokens in both localStorage and cookies for client/server sync
      this.setToken(data.accessToken);
      this.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async signup(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post('/auth/register', credentials, false);
      const data = await HttpClient.parseJsonResponse<AuthResponse>(response);

      // Store tokens in both localStorage and cookies
      this.setToken(data.accessToken);
      this.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await HttpClient.post('/auth/logout', {}, true);
      this.clearToken();
    } catch (error) {
      console.error("Logout error:", error);
      this.clearToken(); // Clear tokens even if API call fails
      throw error;
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = this.getRefreshToken();
      const response = await HttpClient.post('/auth/refresh', { refreshToken }, false);
      const data = await HttpClient.parseJsonResponse<AuthResponse>(response);

      // Update stored tokens
      this.setToken(data.accessToken);
      this.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  },

  getToken(): string | null {
    return (
      localStorage.getItem("auth_token") || Cookies.get("auth_token") || null
    );
  },

  getRefreshToken(): string | null {
    return (
      localStorage.getItem("refresh_token") ||
      Cookies.get("refresh_token") ||
      null
    );
  },

  setToken(token: string): void {
    localStorage.setItem("auth_token", token);
    Cookies.set("auth_token", token, COOKIE_OPTIONS);

    // Also set in document.cookie for server components to access
    document.cookie = `auth_token=${token}; path=/; ${COOKIE_OPTIONS.secure ? "secure; " : ""}samesite=${COOKIE_OPTIONS.sameSite}; max-age=${60 * 60 * 24 * COOKIE_OPTIONS.expires}`;
  },

  setRefreshToken(token: string): void {
    localStorage.setItem("refresh_token", token);
    Cookies.set("refresh_token", token, COOKIE_OPTIONS);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  clearToken(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    Cookies.remove("auth_token");
    Cookies.remove("refresh_token");

    // For server components to know tokens were cleared
    document.cookie =
      "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  },
};
