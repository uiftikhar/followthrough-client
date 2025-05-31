/**
 * Gmail Service (Client-Side)
 * 
 * Handles Gmail operations through our server's proxy endpoints
 * All actual Google API calls are made server-side for security
 */

import { HttpClient } from "./http-client";

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
      size: number;
    };
    parts?: any[];
  };
  sizeEstimate: number;
}

export interface GmailMessagesResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
}

export interface SendEmailResponse {
  messageId: string;
  success: boolean;
}

export class GmailService {
  /**
   * Get Gmail messages
   */
  static async getMessages(options: {
    query?: string;
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
  } = {}): Promise<GmailMessagesResponse> {
    try {
      const params = new URLSearchParams();
      
      if (options.query) params.append('query', options.query);
      if (options.maxResults) params.append('maxResults', options.maxResults.toString());
      if (options.pageToken) params.append('pageToken', options.pageToken);
      if (options.labelIds) {
        options.labelIds.forEach(labelId => params.append('labelIds', labelId));
      }

      const endpoint = `/integrations/gmail/messages${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await HttpClient.get(endpoint);
      return await HttpClient.parseJsonResponse<GmailMessagesResponse>(response);
    } catch (error) {
      console.error('Failed to get Gmail messages:', error);
      throw error;
    }
  }

  /**
   * Get a specific Gmail message by ID
   */
  static async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      const response = await HttpClient.get(`/integrations/gmail/messages/${messageId}`);
      return await HttpClient.parseJsonResponse<GmailMessage>(response);
    } catch (error) {
      console.error('Failed to get Gmail message:', error);
      throw error;
    }
  }

  /**
   * Send an email via Gmail
   */
  static async sendEmail(emailData: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const response = await HttpClient.post('/integrations/gmail/send', emailData);
      return await HttpClient.parseJsonResponse<SendEmailResponse>(response);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Get unread messages
   */
  static async getUnreadMessages(maxResults: number = 20): Promise<GmailMessagesResponse> {
    return this.getMessages({
      query: 'is:unread',
      maxResults,
    });
  }

  /**
   * Get messages from a specific sender
   */
  static async getMessagesFromSender(
    senderEmail: string,
    maxResults: number = 20
  ): Promise<GmailMessagesResponse> {
    return this.getMessages({
      query: `from:${senderEmail}`,
      maxResults,
    });
  }

  /**
   * Search messages
   */
  static async searchMessages(
    searchQuery: string,
    maxResults: number = 20
  ): Promise<GmailMessagesResponse> {
    return this.getMessages({
      query: searchQuery,
      maxResults,
    });
  }

  /**
   * Get Gmail labels
   */
  static async getLabels(): Promise<any[]> {
    try {
      const response = await HttpClient.get('/integrations/gmail/labels');
      return await HttpClient.parseJsonResponse<any[]>(response);
    } catch (error) {
      console.error('Failed to get Gmail labels:', error);
      throw error;
    }
  }

  /**
   * Get user's Gmail profile
   */
  static async getProfile(): Promise<any> {
    try {
      const response = await HttpClient.get('/integrations/gmail/profile');
      return await HttpClient.parseJsonResponse<any>(response);
    } catch (error) {
      console.error('Failed to get Gmail profile:', error);
      throw error;
    }
  }
} 