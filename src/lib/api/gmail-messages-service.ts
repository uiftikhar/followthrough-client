/**
 * Gmail Messages Service
 *
 * Handles Gmail message operations through our server's proxy endpoints
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

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: string;
  labelListVisibility: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Gmail Messages Service
 */
export class GmailMessagesService {
  /**
   * Message Retrieval
   */

  /**
   * Get Gmail messages with optional filtering
   */
  static async getMessages(
    options: {
      query?: string;
      maxResults?: number;
      pageToken?: string;
      labelIds?: string[];
    } = {},
  ): Promise<GmailMessagesResponse> {
    try {
      const params = new URLSearchParams();

      if (options.query) params.append("query", options.query);
      if (options.maxResults)
        params.append("maxResults", options.maxResults.toString());
      if (options.pageToken) params.append("pageToken", options.pageToken);
      if (options.labelIds) {
        options.labelIds.forEach((labelId) =>
          params.append("labelIds", labelId),
        );
      }

      const endpoint = `/integrations/gmail/messages${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await HttpClient.get(endpoint);
      return await HttpClient.parseJsonResponse<GmailMessagesResponse>(
        response,
      );
    } catch (error) {
      console.error("Failed to get Gmail messages:", error);
      throw error;
    }
  }

  /**
   * Get a specific Gmail message by ID
   */
  static async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      const response = await HttpClient.get(
        `/integrations/gmail/messages/${messageId}`,
      );
      return await HttpClient.parseJsonResponse<GmailMessage>(response);
    } catch (error) {
      console.error("Failed to get Gmail message:", error);
      throw error;
    }
  }

  /**
   * Get unread messages
   */
  static async getUnreadMessages(
    maxResults: number = 20,
  ): Promise<GmailMessagesResponse> {
    return this.getMessages({
      query: "is:unread",
      maxResults,
    });
  }

  /**
   * Get messages from a specific sender
   */
  static async getMessagesFromSender(
    senderEmail: string,
    maxResults: number = 20,
  ): Promise<GmailMessagesResponse> {
    return this.getMessages({
      query: `from:${senderEmail}`,
      maxResults,
    });
  }

  /**
   * Get messages with specific label
   */
  static async getMessagesByLabel(
    labelId: string,
    maxResults: number = 20,
  ): Promise<GmailMessagesResponse> {
    return this.getMessages({
      labelIds: [labelId],
      maxResults,
    });
  }

  /**
   * Search messages
   */
  static async searchMessages(
    searchQuery: string,
    maxResults: number = 20,
  ): Promise<GmailMessagesResponse> {
    return this.getMessages({
      query: searchQuery,
      maxResults,
    });
  }

  /**
   * Get recent messages (last 7 days)
   */
  static async getRecentMessages(
    maxResults: number = 20,
  ): Promise<GmailMessagesResponse> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dateString = weekAgo.toISOString().split("T")[0]; // YYYY-MM-DD format

    return this.getMessages({
      query: `after:${dateString}`,
      maxResults,
    });
  }

  /**
   * Message Actions
   */

  /**
   * Send an email via Gmail
   */
  static async sendEmail(
    emailData: SendEmailRequest,
  ): Promise<SendEmailResponse> {
    try {
      const response = await HttpClient.post(
        "/integrations/gmail/send",
        emailData,
      );
      return await HttpClient.parseJsonResponse<SendEmailResponse>(response);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  /**
   * Reply to a message
   */
  static async replyToMessage(
    messageId: string,
    replyData: Omit<SendEmailRequest, "to" | "subject">,
  ): Promise<SendEmailResponse> {
    try {
      const originalMessage = await this.getMessage(messageId);
      const fromHeader = originalMessage.payload.headers.find(
        (h) => h.name.toLowerCase() === "from",
      );
      const subjectHeader = originalMessage.payload.headers.find(
        (h) => h.name.toLowerCase() === "subject",
      );

      if (!fromHeader) {
        throw new Error("Could not find sender in original message");
      }

      const replySubject = subjectHeader?.value.startsWith("Re:")
        ? subjectHeader.value
        : `Re: ${subjectHeader?.value || "(no subject)"}`;

      return this.sendEmail({
        to: fromHeader.value,
        subject: replySubject,
        ...replyData,
      });
    } catch (error) {
      console.error("Failed to reply to message:", error);
      throw error;
    }
  }

  /**
   * Gmail Labels and Profile
   */

  /**
   * Get Gmail labels
   */
  static async getLabels(): Promise<GmailLabel[]> {
    try {
      const response = await HttpClient.get("/integrations/gmail/labels");
      return await HttpClient.parseJsonResponse<GmailLabel[]>(response);
    } catch (error) {
      console.error("Failed to get Gmail labels:", error);
      throw error;
    }
  }

  /**
   * Get user's Gmail profile
   */
  static async getProfile(): Promise<GmailProfile> {
    try {
      const response = await HttpClient.get("/integrations/gmail/profile");
      return await HttpClient.parseJsonResponse<GmailProfile>(response);
    } catch (error) {
      console.error("Failed to get Gmail profile:", error);
      throw error;
    }
  }

  /**
   * Utility Methods
   */

  /**
   * Extract plain text from Gmail message
   */
  static extractPlainText(message: GmailMessage): string {
    const decodeBase64 = (data: string): string => {
      try {
        return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
      } catch (error) {
        return data;
      }
    };

    // Try to get text from body
    if (message.payload.body?.data) {
      return decodeBase64(message.payload.body.data);
    }

    // Try to get text from parts
    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return decodeBase64(part.body.data);
        }
      }
    }

    return message.snippet;
  }

  /**
   * Get sender email from message
   */
  static getSenderEmail(message: GmailMessage): string | null {
    const fromHeader = message.payload.headers.find(
      (h) => h.name.toLowerCase() === "from",
    );
    if (!fromHeader) return null;

    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.value.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : fromHeader.value;
  }

  /**
   * Get subject from message
   */
  static getSubject(message: GmailMessage): string {
    const subjectHeader = message.payload.headers.find(
      (h) => h.name.toLowerCase() === "subject",
    );
    return subjectHeader?.value || "(no subject)";
  }

  /**
   * Check if message is unread
   */
  static isUnread(message: GmailMessage): boolean {
    return message.labelIds.includes("UNREAD");
  }

  /**
   * Check if message is in inbox
   */
  static isInInbox(message: GmailMessage): boolean {
    return message.labelIds.includes("INBOX");
  }
}
