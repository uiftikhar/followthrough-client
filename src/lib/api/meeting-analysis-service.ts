import { HttpClient } from "./http-client";
import { AuthService } from "./auth-service";
import {
  AnalysisResultDto,
  AnalysisStartResponse,
  MeetingAnalysisResponse,
  AnalysisRequest,
} from "@/types/meeting-analysis";
import Cookies from "js-cookie";
import { API_CONFIG } from "@/config/api";

export interface AnalyzeTranscriptRequest {
  transcript: string;
  metadata?: {
    title?: string;
    participants?: string[];
    date?: string;
    duration?: string;
    meetingType?: string;
    useRAG?: boolean; // Optional override, defaults to true
    [key: string]: any;
  };
}

// Re-export the types for convenience
export type { AnalysisResultDto, AnalysisStartResponse, MeetingAnalysisResponse };

function logAvailableCookies() {
  const allCookies = Cookies.get();
  console.log("Available cookies:", Object.keys(allCookies));
  console.log("Auth token cookie exists:", !!allCookies.auth_token);
}

/**
 * Meeting analysis service
 * Handles creating analysis sessions and retrieving results from MongoDB sessions collection
 */
export const MeetingAnalysisService = {
  /**
   * Submit a transcript for analysis - matches integration guide
   * @param request - The transcript and metadata to analyze
   * @returns Promise with session ID and status
   */
  async analyzeTranscript(
    request: AnalyzeTranscriptRequest,
  ): Promise<AnalysisStartResponse> {
    try {
      console.log("Starting meeting analysis per integration guide");
      console.log(`Auth token exists: ${!!AuthService.getToken()}`);

      // Check document cookies for debugging
      logAvailableCookies();

      // Validate input
      if (!request.transcript || request.transcript.trim().length === 0) {
        throw new Error("Transcript cannot be empty");
      }

      if (request.transcript.length > 100000) {
        throw new Error("Transcript is too long (max 100,000 characters)");
      }

      // Prepare the request payload to match integration guide
      const payload: AnalysisRequest = {
        transcript: request.transcript,
        metadata: {
          title: request.metadata?.title || "Meeting Analysis",
          participants: request.metadata?.participants || [],
          date: request.metadata?.date || new Date().toISOString(),
          duration: request.metadata?.duration,
          meetingType: request.metadata?.meetingType,
        }
      };

      console.log("Submitting analysis request per integration guide:", {
        transcriptLength: payload.transcript.length,
        metadata: payload.metadata,
      });

      const response = await HttpClient.post("/api/meeting-analysis", payload);
      const result = await HttpClient.parseJsonResponse<AnalysisStartResponse>(response);

      console.log("Analysis request submitted successfully per integration guide:", result);
      return result;
    } catch (error: unknown) {
      console.error("Submit analysis error:", error);

      // Handle authentication errors
      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        console.error("Authentication error: Token invalid or expired");
        AuthService.clearToken(); // Clear invalid token
      }

      throw error;
    }
  },

  /**
   * Get analysis results for a session from MongoDB sessions collection
   * Matches integration guide GET /api/meeting-analysis/{sessionId}
   * @param sessionId - The session ID to get results for
   * @returns Promise with analysis results
   */
  async getAnalysisResults(
    sessionId: string,
  ): Promise<AnalysisResultDto> {
    try {
      console.log(
        `Fetching analysis results for session ${sessionId} from MongoDB sessions collection (integration guide)`,
      );
      console.log(`Auth token exists: ${!!AuthService.getToken()}`);

      // Check document cookies for debugging
      logAvailableCookies();

      if (!sessionId || sessionId.trim().length === 0) {
        throw new Error("Session ID is required");
      }

      const response = await HttpClient.get(`/api/meeting-analysis/${sessionId}`);
      const result = await HttpClient.parseJsonResponse<AnalysisResultDto>(response);

      console.log("Analysis results retrieved successfully from MongoDB sessions collection:", {
        sessionId: result.sessionId,
        userId: result.userId,
        status: result.status,
        progress: result.progress,
        hasTopics: !!result.topics?.length,
        hasActionItems: !!result.actionItems?.length,
        hasSummary: !!result.summary,
        hasSentiment: !!result.sentiment,
        ragEnabled: result.metadata?.ragEnabled,
        ragUsed: result.metadata?.ragUsed,
        startTime: result.startTime,
        endTime: result.endTime,
        analysisCompletedAt: result.metadata?.analysisCompletedAt
      });

      return result;
    } catch (error: unknown) {
      console.error("Get analysis results error:", error);

      // Handle authentication errors
      if (
        error instanceof Error &&
        error.message.includes("Authentication expired")
      ) {
        console.error("Authentication error: Token invalid or expired");
        AuthService.clearToken(); // Clear invalid token
      }

      throw error;
    }
  },

  /**
   * Poll for analysis completion with recommended intervals from integration guide
   * @param sessionId - The session ID to poll
   * @param maxAttempts - Maximum number of polling attempts (default: 30 for 60 seconds)
   * @param interval - Polling interval in milliseconds (default: 2000ms as recommended)
   * @returns Promise with final results
   */
  async waitForResults(
    sessionId: string,
    maxAttempts: number = 30,
    interval: number = 2000
  ): Promise<AnalysisResultDto> {
    console.log(`Starting polling per integration guide for session ${sessionId} (max ${maxAttempts} attempts, ${interval}ms interval)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.getAnalysisResults(sessionId);
        
        console.log(`Poll attempt ${attempt}/${maxAttempts}: Status = ${result.status} (${result.progress}%)`);
        
        if (result.status === 'completed') {
          console.log('Analysis completed successfully per integration guide!');
          this.logResults(result);
          return result;
        } else if (result.status === 'failed') {
          // Updated to use analysisErrors instead of errors per integration guide
          const errorMessage = result.analysisErrors?.[0]?.error || 'Unknown error occurred';
          throw new Error(`Analysis failed: ${errorMessage}`);
        }
        
        // Continue polling for pending/in_progress status
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
        
      } catch (error) {
        console.error(`Poll attempt ${attempt} failed:`, error);
        
        // If this is not the last attempt and it's a network error, continue
        if (attempt < maxAttempts && error instanceof Error && 
            (error.message.includes('fetch') || error.message.includes('network'))) {
          console.log('Network error, retrying...');
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        // For other errors or last attempt, rethrow
        throw error;
      }
    }
    
    throw new Error('Analysis timeout - maximum polling attempts reached');
  },

  /**
   * Log comprehensive results from MongoDB sessions collection
   * @param result - The analysis result to log
   */
  logResults(result: AnalysisResultDto): void {
    console.log("=== COMPREHENSIVE ANALYSIS RESULTS FROM MONGODB ===");
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`User ID: ${result.userId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Progress: ${result.progress}%`);
    console.log(`Start Time: ${result.startTime}`);
    console.log(`End Time: ${result.endTime}`);
    console.log(`Processing Time: ${result.metadata?.processingTime}`);
    console.log(`RAG Enabled: ${result.metadata?.ragEnabled}`);
    console.log(`RAG Used: ${result.metadata?.ragUsed}`);
    
    console.log("\n--- TOPICS ---");
    if (result.topics?.length) {
      result.topics.forEach((topic, index) => {
        console.log(`${index + 1}. ${topic.name} (Relevance: ${topic.relevance}/10)`);
        console.log(`   Description: ${topic.description}`);
        console.log(`   Keywords: ${topic.keywords?.join(', ')}`);
        console.log(`   Participants: ${topic.participants?.join(', ')}`);
      });
    } else {
      console.log("No topics found");
    }
    
    console.log("\n--- ACTION ITEMS ---");
    if (result.actionItems?.length) {
      result.actionItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.description}`);
        console.log(`   Assignee: ${item.assignee || 'Not assigned'}`);
        console.log(`   Deadline: ${item.deadline || 'No deadline'}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Priority: ${item.priority || 'Not set'}`);
      });
    } else {
      console.log("No action items found");
    }
    
    console.log("\n--- SUMMARY ---");
    if (result.summary) {
      console.log(`Meeting Title: ${result.summary.meetingTitle}`);
      console.log(`Summary: ${result.summary.summary}`);
      if (result.summary.decisions?.length) {
        console.log("Decisions:");
        result.summary.decisions.forEach((decision, index) => {
          console.log(`  ${index + 1}. ${decision.title}: ${decision.content}`);
        });
      }
    } else {
      console.log("No summary available");
    }
    
    console.log("\n--- SENTIMENT ANALYSIS ---");
    if (result.sentiment) {
      console.log(`Overall Sentiment: ${result.sentiment.overall}`);
      console.log(`Segments: ${result.sentiment.segments?.length || 0}`);
    } else {
      console.log("No sentiment analysis available");
    }
    
    if (result.analysisErrors?.length) {
      console.log("\n--- ERRORS ---");
      result.analysisErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.step}: ${error.error} (${error.timestamp})`);
      });
    }
    
    console.log("================================================");
  },

  /**
   * Validate transcript format and length - matches integration guide requirements
   * @param transcript - The transcript to validate
   * @returns Validation result
   */
  validateTranscript(transcript: string): { valid: boolean; error?: string } {
    if (!transcript || transcript.trim().length === 0) {
      return { valid: false, error: "Transcript cannot be empty" };
    }
    
    if (transcript.length < 50) {
      return { valid: false, error: "Transcript is too short (minimum 50 characters)" };
    }
    
    if (transcript.length > 100000) {
      return { valid: false, error: "Transcript is too long (maximum 100,000 characters)" };
    }
    
    return { valid: true };
  },

  /**
   * Get WebSocket URL for real-time updates (if implemented by server)
   * @param sessionId - The session ID to get WebSocket URL for
   * @returns WebSocket URL
   */
  getWebSocketUrl(sessionId: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    return `${wsProtocol}//${wsHost}/ws/meeting-analysis/${sessionId}`;
  }
};
