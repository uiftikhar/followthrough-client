import { HttpClient } from "./http-client";
import { AuthService } from "./auth-service";
import {
  AnalysisResult,
  MeetingAnalysisResponse,
} from "@/types/meeting-analysis";
import Cookies from "js-cookie";
import { API_CONFIG } from "@/config/api";

export interface AnalyzeTranscriptRequest {
  transcript: string;
  metadata?: {
    title?: string;
    participants?: string[];
    date?: string;
    [key: string]: any;
  };
}

// Re-export the types for convenience
export type { AnalysisResult, MeetingAnalysisResponse };

// Helper to check all available cookies
const logAvailableCookies = () => {
  try {
    // Get all cookies
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
    console.log("Available cookies:", cookies);

    // Check specifically for auth token
    const authToken = Cookies.get("auth_token");
    console.log("Found auth token in cookies:", !!authToken);
  } catch (e) {
    console.log("Cannot log cookies - likely server-side rendering");
  }
};

/**
 * Meeting analysis service
 * Handles creating analysis sessions and retrieving results
 */
export const MeetingAnalysisService = {
  async analyzeTranscript(
    data: AnalyzeTranscriptRequest,
  ): Promise<{ sessionId: string }> {
    try {
      logAvailableCookies();

      console.log("Using centralized HTTP client for analysis");
      
      const response = await HttpClient.post('/api/meeting-analysis', data);
      const result = await HttpClient.parseJsonResponse<{ sessionId: string }>(response);

      return result;
    } catch (error) {
      console.error("Analyze transcript error:", error);

      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication expired')) {
        console.error("Authentication error: Token invalid or expired");
        AuthService.clearToken(); // Clear invalid token
      }

      throw error;
    }
  },

  async getAnalysisResults(
    sessionId: string,
  ): Promise<MeetingAnalysisResponse> {
    try {
      console.log(
        `Fetching analysis results for session ${sessionId} using centralized HTTP client`,
      );
      console.log(`Auth token exists: ${!!AuthService.getToken()}`);

      // Check document cookies for debugging
      logAvailableCookies();

      const response = await HttpClient.get(`/meeting-analysis/${sessionId}`);
      const result = await HttpClient.parseJsonResponse<MeetingAnalysisResponse>(response);

      console.log("Results response received successfully");
      return result;
    } catch (error: unknown) {
      console.error("Get analysis results error:", error);

      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication expired')) {
        console.error("Authentication error: Token invalid or expired");
        AuthService.clearToken(); // Clear invalid token
      }

      throw error;
    }
  },

  // WebSocket connection helpers
  getWebSocketUrl(sessionId: string): string {
    // Use the wsBaseUrl from API_CONFIG which handles browser context properly
    const wsUrl = API_CONFIG.wsBaseUrl;
    const token = AuthService.getToken();
    console.log(
      `Creating WebSocket URL for session ${sessionId} using base ${wsUrl}`,
    );
    return `${wsUrl}/meeting-analysis/ws/${sessionId}?token=${token}`;
  },
};
