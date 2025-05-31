import { HttpClient } from "./http-client";
import { Transcript } from "@/types/transcript";

/**
 * API service for transcript operations
 */
export const transcriptApi = {
  /**
   * Get all transcripts for the current user
   */
  async getTranscripts(): Promise<Transcript[]> {
    const response = await HttpClient.get('/api/transcripts');
    return await HttpClient.parseJsonResponse<Transcript[]>(response);
  },

  /**
   * Get a single transcript by ID
   */
  async getTranscript(id: string): Promise<Transcript> {
    const response = await HttpClient.get(`/api/transcripts/${id}`);
    return await HttpClient.parseJsonResponse<Transcript>(response);
  },

  /**
   * Upload a new transcript file
   */
  async uploadTranscript(
    file: File,
    metadata?: Record<string, any>,
  ): Promise<Transcript> {
    const formData = new FormData();
    formData.append("file", file);

    // Add metadata if provided
    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    // Use the specialized upload method for FormData
    const response = await HttpClient.uploadFile('/api/transcripts/upload', formData);
    return await HttpClient.parseJsonResponse<Transcript>(response);
  },

  /**
   * Update transcript metadata or content
   */
  async updateTranscript(
    id: string,
    data: Partial<Transcript>,
  ): Promise<Transcript> {
    const response = await HttpClient.put(`/api/transcripts/${id}`, data);
    return await HttpClient.parseJsonResponse<Transcript>(response);
  },

  /**
   * Delete a transcript
   */
  async deleteTranscript(id: string): Promise<void> {
    await HttpClient.delete(`/api/transcripts/${id}`);
  },

  /**
   * Analyze a transcript
   */
  async analyzeTranscript(id: string): Promise<Transcript> {
    const response = await HttpClient.post(`/api/transcripts/${id}/analyze`);
    return await HttpClient.parseJsonResponse<Transcript>(response);
  },

  /**
   * Search transcripts
   */
  async searchTranscripts(query: string): Promise<Transcript[]> {
    const response = await HttpClient.authenticatedRequest(`/api/transcripts/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
    });
    return await HttpClient.parseJsonResponse<Transcript[]>(response);
  },
};
