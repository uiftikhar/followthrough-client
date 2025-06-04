/**
 * Gmail Push Notifications Service
 *
 * Handles Gmail Push Notifications through Pub/Sub integration
 * Focused on notification setup, management, and monitoring
 */

import { HttpClient } from "./http-client";

/**
 * Notification DTOs
 */
export interface WatchInfo {
  watchId: string;
  historyId: string;
  expiresAt: string;
  isActive: boolean;
  googleEmail: string;
  notificationsReceived: number;
  emailsProcessed: number;
  errorCount: number;
  lastError?: string;
}

export interface SetupGmailNotificationsDto {
  labelIds?: string[];
  labelFilterBehavior?: "INCLUDE" | "EXCLUDE";
}

export interface NotificationStatus {
  isEnabled: boolean;
  watchInfo?: WatchInfo;
}

export interface SetupNotificationsResponse {
  success: boolean;
  message: string;
  watchInfo?: WatchInfo;
  nextSteps?: string[];
  error?: string;
}

export interface DisableNotificationsResponse {
  success: boolean;
  message: string;
  nextSteps?: string[];
}

export interface PullMessagesResponse {
  success: boolean;
  processed: number;
  notifications?: Array<{
    emailAddress: string;
    historyId: string;
  }>;
  message: string;
}

export interface NotificationSubscriptionDto {
  webhookUrl?: string;
  email?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  subscription?: {
    userId: string;
    webhookUrl?: string;
    email?: string;
    subscribedAt: string;
    types: string[];
  };
  note?: string;
}

export interface SubscriptionsListResponse {
  success: boolean;
  subscriptions: Array<{
    id: string;
    type: "webhook" | "email";
    url?: string;
    email?: string;
    events: string[];
    active: boolean;
  }>;
  message?: string;
}

/**
 * Gmail Push Notifications Service
 */
export class GmailNotificationsService {
  /**
   * Notification Status and Management
   */

  /**
   * Get current notification status
   */
  static async getStatus(): Promise<NotificationStatus> {
    try {
      const response = await HttpClient.get("/gmail/client/status");
      const data = await HttpClient.parseJsonResponse<{
        success: boolean;
        oauth: any;
        notifications: NotificationStatus;
        system: any;
        nextSteps: string[];
      }>(response);
      return data.notifications;
    } catch (error) {
      console.error("Failed to get notification status:", error);
      throw error;
    }
  }

  /**
   * Setup Gmail push notifications
   */
  static async setupNotifications(
    options: SetupGmailNotificationsDto = {},
  ): Promise<SetupNotificationsResponse> {
    try {
      const response = await HttpClient.post(
        "/gmail/client/setup-notifications",
        options,
      );
      return await HttpClient.parseJsonResponse<SetupNotificationsResponse>(
        response,
      );
    } catch (error) {
      console.error("Failed to setup Gmail notifications:", error);
      throw error;
    }
  }

  /**
   * Disable Gmail push notifications
   */
  static async disableNotifications(): Promise<DisableNotificationsResponse> {
    try {
      const response = await HttpClient.delete(
        "/gmail/client/disable-notifications",
      );
      return await HttpClient.parseJsonResponse<DisableNotificationsResponse>(
        response,
      );
    } catch (error) {
      console.error("Failed to disable Gmail notifications:", error);
      throw error;
    }
  }

  /**
   * Renew Gmail watch (extend expiration)
   */
  static async renewWatch(): Promise<SetupNotificationsResponse> {
    try {
      const response = await HttpClient.post("/gmail/client/renew-watch");
      return await HttpClient.parseJsonResponse<SetupNotificationsResponse>(
        response,
      );
    } catch (error) {
      console.error("Failed to renew Gmail watch:", error);
      throw error;
    }
  }

  /**
   * Process pending messages manually
   */
  static async processPendingMessages(): Promise<PullMessagesResponse> {
    try {
      const response = await HttpClient.post(
        "/gmail/client/process-pull-messages",
      );
      return await HttpClient.parseJsonResponse<PullMessagesResponse>(response);
    } catch (error) {
      console.error("Failed to process pending messages:", error);
      throw error;
    }
  }

  /**
   * Test Pub/Sub connection
   */
  static async testPubSub(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await HttpClient.post("/gmail/client/test-pubsub");
      return await HttpClient.parseJsonResponse<{
        success: boolean;
        message: string;
      }>(response);
    } catch (error) {
      console.error("Failed to test Pub/Sub connection:", error);
      throw error;
    }
  }

  /**
   * Subscription Management
   */

  /**
   * Subscribe to notifications
   */
  static async subscribeToNotifications(
    dto: NotificationSubscriptionDto,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await HttpClient.post("/gmail/client/subscribe", dto);
      return await HttpClient.parseJsonResponse<SubscriptionResponse>(response);
    } catch (error) {
      console.error("Failed to subscribe to notifications:", error);
      throw error;
    }
  }

  /**
   * Get all subscriptions
   */
  static async getSubscriptions(): Promise<SubscriptionsListResponse> {
    try {
      const response = await HttpClient.get("/gmail/client/subscriptions");
      return await HttpClient.parseJsonResponse<SubscriptionsListResponse>(
        response,
      );
    } catch (error) {
      console.error("Failed to get subscriptions:", error);
      throw error;
    }
  }

  /**
   * Utility Methods
   */

  /**
   * Check if notifications are enabled
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.isEnabled;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get watch information
   */
  static async getWatchInfo(): Promise<WatchInfo | null> {
    try {
      const status = await this.getStatus();
      return status.watchInfo || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if watch needs renewal (expires within 24 hours)
   */
  static async needsWatchRenewal(): Promise<boolean> {
    try {
      const watchInfo = await this.getWatchInfo();
      if (!watchInfo || !watchInfo.expiresAt) return false;

      const expiresAt = new Date(watchInfo.expiresAt);
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      return expiresAt < twentyFourHoursFromNow;
    } catch (error) {
      return false;
    }
  }
}
