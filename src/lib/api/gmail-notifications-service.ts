/**
 * Gmail Push Notifications Service (Client-Side)
 * 
 * Handles Gmail Push Notifications through Pub/Sub integration
 * Communicates with the server's Gmail client API endpoints
 */

import { HttpClient } from './http-client';

export interface GmailNotificationStatus {
  success: boolean;
  isConnected: boolean;
  expiresAt?: string;
  needsRefresh?: boolean;
  scopes?: string[];
  googleEmail?: string;
  userInfo?: {
    googleUserId: string;
    googleEmail: string;
    googleName: string;
    googlePicture: string;
  };
}

export interface GmailNotificationSetup {
  labelIds?: string[];
  topicName?: string;
}

export interface GmailHealthStatus {
  success: boolean;
  status: string;
  pubsub: {
    connected: boolean;
    subscriptions: {
      pushSubscription: {
        exists: boolean;
      };
      pullSubscription: {
        exists: boolean;
      };
    };
  };
  watches: {
    totalActive: number;
    expiringSoon: number;
    withErrors: number;
    totalNotifications: number;
    totalEmailsProcessed: number;
  };
  timestamp: string;
}

export interface GmailStatistics {
  success: boolean;
  watches: {
    totalActive: number;
    expiringSoon: number;
    withErrors: number;
    totalNotifications: number;
    totalEmailsProcessed: number;
  };
  pubsub: {
    pushSubscription: {
      exists: boolean;
    };
    pullSubscription: {
      exists: boolean;
    };
  };
  timestamp: string;
}

export interface EmailTriageResult {
  success: boolean;
  message: string;
  processedEmails?: number;
  results?: Array<{
    messageId: string;
    subject: string;
    priority: string;
    category: string;
  }>;
}

export class GmailNotificationsService {
  /**
   * Get OAuth authorization URL for Gmail
   */
  static async getAuthUrl(): Promise<string> {
    try {
      const response = await HttpClient.get('/gmail/client/auth-url');
      const data = await HttpClient.parseJsonResponse<{ authUrl: string }>(response);
      return data.authUrl;
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
      throw error;
    }
  }

  /**
   * Get Gmail connection and notification status
   */
  static async getStatus(): Promise<GmailNotificationStatus> {
    try {
      const response = await HttpClient.get('/gmail/client/status');
      return await HttpClient.parseJsonResponse<GmailNotificationStatus>(response);
    } catch (error) {
      console.error('Failed to get Gmail notification status:', error);
      throw error;
    }
  }

  /**
   * Setup Gmail push notifications
   */
  static async setupNotifications(options: GmailNotificationSetup = {}): Promise<{ success: boolean; message: string }> {
    try {
      const response = await HttpClient.post('/gmail/client/setup-notifications', options);
      return await HttpClient.parseJsonResponse<{ success: boolean; message: string }>(response);
    } catch (error) {
      console.error('Failed to setup Gmail notifications:', error);
      throw error;
    }
  }

  /**
   * Disable Gmail push notifications
   */
  static async disableNotifications(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await HttpClient.delete('/gmail/client/disable-notifications');
      return await HttpClient.parseJsonResponse<{ success: boolean; message: string }>(response);
    } catch (error) {
      console.error('Failed to disable Gmail notifications:', error);
      throw error;
    }
  }

  /**
   * Manually renew watch
   */
  static async renewWatch(): Promise<{ success: boolean; message: string; expiresAt?: string }> {
    try {
      const response = await HttpClient.post('/gmail/client/renew-watch');
      return await HttpClient.parseJsonResponse<{ success: boolean; message: string; expiresAt?: string }>(response);
    } catch (error) {
      console.error('Failed to renew Gmail watch:', error);
      throw error;
    }
  }

  /**
   * Test email triage without real emails
   */
  static async testTriage(): Promise<EmailTriageResult> {
    try {
      const response = await HttpClient.post('/gmail/client/test-triage');
      return await HttpClient.parseJsonResponse<EmailTriageResult>(response);
    } catch (error) {
      console.error('Failed to test email triage:', error);
      throw error;
    }
  }

  /**
   * Get system health check
   */
  static async getHealth(): Promise<GmailHealthStatus> {
    try {
      const response = await HttpClient.get('/gmail/client/health');
      return await HttpClient.parseJsonResponse<GmailHealthStatus>(response);
    } catch (error) {
      console.error('Failed to get Gmail health status:', error);
      throw error;
    }
  }

  /**
   * Get detailed watch statistics
   */
  static async getStatistics(): Promise<GmailStatistics> {
    try {
      const response = await HttpClient.get('/gmail/client/statistics');
      return await HttpClient.parseJsonResponse<GmailStatistics>(response);
    } catch (error) {
      console.error('Failed to get Gmail statistics:', error);
      throw error;
    }
  }

  /**
   * Test Pub/Sub connection
   */
  static async testPubSub(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await HttpClient.post('/gmail/client/test-pubsub');
      return await HttpClient.parseJsonResponse<{ success: boolean; message: string }>(response);
    } catch (error) {
      console.error('Failed to test Pub/Sub connection:', error);
      throw error;
    }
  }

  /**
   * Process pull messages manually
   */
  static async processPullMessages(): Promise<{ success: boolean; message: string; messagesProcessed?: number }> {
    try {
      const response = await HttpClient.post('/gmail/client/process-pull-messages');
      return await HttpClient.parseJsonResponse<{ success: boolean; message: string; messagesProcessed?: number }>(response);
    } catch (error) {
      console.error('Failed to process pull messages:', error);
      throw error;
    }
  }
} 