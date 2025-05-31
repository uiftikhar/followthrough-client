import { HttpClient } from "./http-client";

export interface ChatSession {
  id: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  attachments?: Array<{
    type: string;
    data: any;
    metadata?: Record<string, any>;
  }>;
}

export interface ChatResponse {
  id: string;
  content: string;
  type: "text" | "visualization" | "error" | "loading" | "analysis" | "action";
  timestamp: number;
  attachments?: Array<{
    type: string;
    data: any;
    metadata?: Record<string, any>;
  }>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface TranscriptUploadResponse {
  meetingId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: number;
}

export interface AnalysisStatusResponse {
  meetingId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: {
    overallProgress: number;
    started: number;
    lastUpdated: number;
  };
}

/**
 * API service for chat operations
 */
export const chatApi = {
  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<ChatSession> {
    const response = await HttpClient.post('/api/chat/session', { userId, metadata });
    return await HttpClient.parseJsonResponse<ChatSession>(response);
  },

  /**
   * Get chat session details
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    const response = await HttpClient.get(`/api/chat/session/${sessionId}`);
    return await HttpClient.parseJsonResponse<ChatSession>(response);
  },

  /**
   * Send a message to the chat agent
   */
  async sendMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<ChatResponse> {
    const response = await HttpClient.post('/api/chat/message', { sessionId, content, metadata });
    return await HttpClient.parseJsonResponse<ChatResponse>(response);
  },

  /**
   * Get message history for a session
   */
  async getMessageHistory(
    sessionId: string,
    limit?: number,
  ): Promise<ChatMessage[]> {
    const endpoint = limit 
      ? `/api/chat/history/${sessionId}?limit=${limit}`
      : `/api/chat/history/${sessionId}`;
    const response = await HttpClient.get(endpoint);
    return await HttpClient.parseJsonResponse<ChatMessage[]>(response);
  },

  /**
   * Upload a transcript for analysis
   */
  async uploadTranscript(
    transcript: string,
    title?: string,
    description?: string,
    participants?: Array<{ id: string; name: string; role?: string }>,
  ): Promise<TranscriptUploadResponse> {
    const response = await HttpClient.post('/api/chat/transcript/upload', {
      transcript,
      title,
      description,
      participants,
    });
    return await HttpClient.parseJsonResponse<TranscriptUploadResponse>(response);
  },

  /**
   * Start or resume analysis for a transcript
   */
  async analyzeTranscript(
    meetingId: string,
    goals?: string[],
    options?: Record<string, any>,
  ): Promise<AnalysisStatusResponse> {
    const response = await HttpClient.post(`/api/chat/transcript/${meetingId}/analyze`, {
      goals,
      options,
    });
    return await HttpClient.parseJsonResponse<AnalysisStatusResponse>(response);
  },

  /**
   * Get analysis status
   */
  async getAnalysisStatus(meetingId: string): Promise<AnalysisStatusResponse> {
    const response = await HttpClient.get(`/api/chat/transcript/${meetingId}/status`);
    return await HttpClient.parseJsonResponse<AnalysisStatusResponse>(response);
  },

  /**
   * Get related meetings
   */
  async getRelatedMeetings(meetingId: string): Promise<any[]> {
    const response = await HttpClient.get(`/api/chat/transcript/${meetingId}/related`);
    return await HttpClient.parseJsonResponse<any[]>(response);
  },
};
