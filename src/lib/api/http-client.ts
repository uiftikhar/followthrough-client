/**
 * Centralized HTTP Client
 *
 * Handles common HTTP request logic and headers for all API services
 * Includes ngrok header for local development/testing
 */

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

export class HttpClient {
  private static readonly API_BASE = "https://followthrough-server-production.up.railway.app";

  /**
   * Get the JWT token from localStorage
   */
  private static getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("jwt_token");
  }

  /**
   * Get common headers for all requests
   */
  private static getCommonHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      // Add ngrok header for local development/testing
      // "ngrok-skip-browser-warning": "any-value",
    };

    return headers;
  }

  /**
   * Get common headers without Content-Type (for file uploads)
   */
  private static getCommonHeadersWithoutContentType(): HeadersInit {
    const headers: HeadersInit = {
      // Add ngrok header for local development/testing
      // "ngrok-skip-browser-warning": "any-value",
    };

    return headers;
  }

  /**
   * Get authenticated headers (includes auth token)
   */
  private static getAuthenticatedHeaders(): HeadersInit {
    const token = this.getAuthToken();
    const commonHeaders = this.getCommonHeaders();

    if (!token) {
      throw new Error("Authentication required. Please log in first.");
    }

    return {
      ...commonHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Get authenticated headers without Content-Type (for file uploads)
   */
  private static getAuthenticatedHeadersWithoutContentType(): HeadersInit {
    const token = this.getAuthToken();
    const commonHeaders = this.getCommonHeadersWithoutContentType();

    if (!token) {
      throw new Error("Authentication required. Please log in first.");
    }

    return {
      ...commonHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Make an authenticated request
   */
  static async authenticatedRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = this.getAuthenticatedHeaders();

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // Handle common authentication errors
    if (response.status === 401) {
      throw new Error("Authentication expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("Access denied. Please check your permissions.");
    }

    return response;
  }

  /**
   * Make a public request (no authentication required)
   */
  static async publicRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = this.getCommonHeaders();

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    return response;
  }

  /**
   * Helper method for GET requests
   */
  static async get(
    endpoint: string,
    authenticated: boolean = true,
  ): Promise<Response> {
    return authenticated
      ? this.authenticatedRequest(endpoint, { method: "GET" })
      : this.publicRequest(endpoint, { method: "GET" });
  }

  /**
   * Helper method for POST requests
   */
  static async post(
    endpoint: string,
    data?: any,
    authenticated: boolean = true,
  ): Promise<Response> {
    const options: RequestInit = {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    };

    return authenticated
      ? this.authenticatedRequest(endpoint, options)
      : this.publicRequest(endpoint, options);
  }

  /**
   * Helper method for PUT requests
   */
  static async put(
    endpoint: string,
    data?: any,
    authenticated: boolean = true,
  ): Promise<Response> {
    const options: RequestInit = {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    };

    return authenticated
      ? this.authenticatedRequest(endpoint, options)
      : this.publicRequest(endpoint, options);
  }

  /**
   * Helper method for DELETE requests
   */
  static async delete(
    endpoint: string,
    authenticated: boolean = true,
  ): Promise<Response> {
    return authenticated
      ? this.authenticatedRequest(endpoint, { method: "DELETE" })
      : this.publicRequest(endpoint, { method: "DELETE" });
  }

  /**
   * Helper method to parse JSON response with error handling
   */
  static async parseJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed: ${response.status}`,
      );
    }

    return await response.json();
  }

  /**
   * Helper method for file uploads (FormData)
   */
  static async uploadFile(
    endpoint: string,
    formData: FormData,
    authenticated: boolean = true,
  ): Promise<Response> {
    const headers = authenticated
      ? this.getAuthenticatedHeadersWithoutContentType()
      : this.getCommonHeadersWithoutContentType();

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      method: "POST",
      body: formData,
      headers,
    });

    // Handle common authentication errors
    if (authenticated) {
      if (response.status === 401) {
        throw new Error("Authentication expired. Please log in again.");
      }

      if (response.status === 403) {
        throw new Error("Access denied. Please check your permissions.");
      }
    }

    return response;
  }
}
