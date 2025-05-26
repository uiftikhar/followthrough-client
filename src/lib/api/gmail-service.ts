/**
 * Gmail Service (Client-Side)
 * 
 * Handles Gmail operations through our server's proxy endpoints
 * All actual Google API calls are made server-side for security
 */

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
  private static readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  /**
   * Get the JWT token from localStorage
   */
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Make authenticated request to server
   */
  private static async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in first.');
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('Google account not connected. Please connect your Google account first.');
    }

    return response;
  }

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

      const response = await this.makeAuthenticatedRequest(
        `/integrations/gmail/messages?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get Gmail messages: ${response.status}`);
      }

      return await response.json();
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
      const response = await this.makeAuthenticatedRequest(
        `/integrations/gmail/messages/${messageId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get Gmail message: ${response.status}`);
      }

      return await response.json();
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
      const response = await this.makeAuthenticatedRequest(
        '/integrations/gmail/send',
        {
          method: 'POST',
          body: JSON.stringify(emailData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send email: ${response.status}`);
      }

      return await response.json();
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
      const response = await this.makeAuthenticatedRequest('/integrations/gmail/labels');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get Gmail labels: ${response.status}`);
      }

      return await response.json();
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
      const response = await this.makeAuthenticatedRequest('/integrations/gmail/profile');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get Gmail profile: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Gmail profile:', error);
      throw error;
    }
  }
} 