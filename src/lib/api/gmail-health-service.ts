/**
 * Gmail System Health Service
 *
 * Handles system health monitoring, statistics, and diagnostics
 * for the Gmail integration system
 */

import { HttpClient } from "./http-client";

/**
 * Health and Statistics DTOs
 */
export interface SystemHealthResponse {
  success: boolean;
  status: 'healthy' | 'unhealthy';
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

export interface StatisticsResponse {
  success: boolean;
  watches: {
    totalActive: number;
    expiringSoon: number;
    withErrors: number;
    totalNotifications: number;
    totalEmailsProcessed: number;
  };
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
  timestamp: string;
}

export interface WatchStatistics {
  totalActive: number;
  expiringSoon: number;
  withErrors: number;
  totalNotifications: number;
  totalEmailsProcessed: number;
  healthyWatches: number;
  errorRate: number;
}

export interface PubSubHealth {
  connected: boolean;
  subscriptionsHealthy: boolean;
  messageBacklog: number;
  lastProcessedAt?: string;
  errorCount: number;
  throughputPerHour: number;
}

/**
 * Gmail Health Service
 */
export class GmailHealthService {
  /**
   * System Health Checks
   */

  /**
   * Get overall system health status
   */
  static async getSystemHealth(): Promise<SystemHealthResponse> {
    try {
      // Public endpoint for health check
      const response = await HttpClient.get("/gmail/client/health", false);
      return await HttpClient.parseJsonResponse<SystemHealthResponse>(response);
    } catch (error) {
      console.error("Failed to get system health:", error);
      throw error;
    }
  }

  /**
   * Get detailed system statistics
   */
  static async getStatistics(): Promise<StatisticsResponse> {
    try {
      const response = await HttpClient.get("/gmail/client/statistics");
      return await HttpClient.parseJsonResponse<StatisticsResponse>(response);
    } catch (error) {
      console.error("Failed to get statistics:", error);
      throw error;
    }
  }

  /**
   * Test Pub/Sub connection health
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
   * Check if system is healthy
   */
  static async isSystemHealthy(): Promise<boolean> {
    try {
      const health = await this.getSystemHealth();
      return health.success && health.status === "healthy";
    } catch (error) {
      return false;
    }
  }

  /**
   * Analytics and Monitoring
   */

  /**
   * Get watch health summary
   */
  static async getWatchHealth(): Promise<WatchStatistics> {
    try {
      const stats = await this.getStatistics();
      const watches = stats.watches;

      const healthyWatches = watches.totalActive - watches.withErrors;
      const errorRate =
        watches.totalActive > 0
          ? (watches.withErrors / watches.totalActive) * 100
          : 0;

      return {
        ...watches,
        healthyWatches,
        errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      console.error("Failed to get watch health:", error);
      throw error;
    }
  }

  /**
   * Get Pub/Sub health summary
   */
  static async getPubSubHealth(): Promise<PubSubHealth> {
    try {
      const [stats, testResult] = await Promise.all([
        this.getStatistics(),
        this.testPubSub()
      ]);

      const pubsubStats = stats.pubsub.subscriptions;
      const messageBacklog = 0; // No message backlog info available in current API

      return {
        connected: testResult.success,
        subscriptionsHealthy: pubsubStats.pushSubscription.exists && pubsubStats.pullSubscription.exists,
        messageBacklog,
        errorCount: 0, // Would need additional endpoint for this
        throughputPerHour: 0, // Would need additional endpoint for this
      };
    } catch (error) {
      console.error('Failed to get Pub/Sub health:', error);
      throw error;
    }
  }

  /**
   * Health Monitoring Utilities
   */

  /**
   * Get system uptime and availability
   */
  static async getUptime(): Promise<{
    uptimeSeconds: number;
    availability: number;
    lastDowntime?: string;
  }> {
    try {
      // This would require additional backend endpoints
      // For now, return basic health-based availability
      const isHealthy = await this.isSystemHealthy();

      return {
        uptimeSeconds: 0, // Would need backend endpoint
        availability: isHealthy ? 100 : 0,
      };
    } catch (error) {
      console.error("Failed to get uptime:", error);
      return {
        uptimeSeconds: 0,
        availability: 0,
      };
    }
  }

  /**
   * Check if watches need attention
   */
  static async needsAttention(): Promise<{
    hasIssues: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const [health, watchHealth] = await Promise.all([
        this.getSystemHealth(),
        this.getWatchHealth(),
      ]);

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check overall health
      if (health.status !== "healthy") {
        issues.push("System is not healthy");
        recommendations.push(
          "Check system logs and restart services if needed",
        );
      }

      // Check Pub/Sub
      if (!health.pubsub.connected) {
        issues.push("Pub/Sub connection is down");
        recommendations.push("Check Pub/Sub configuration and credentials");
      }

      // Check watches
      if (watchHealth.withErrors > 0) {
        issues.push(`${watchHealth.withErrors} watches have errors`);
        recommendations.push(
          "Review watch configurations and renew expired watches",
        );
      }

      if (watchHealth.expiringSoon > 0) {
        issues.push(`${watchHealth.expiringSoon} watches are expiring soon`);
        recommendations.push("Renew watches that are expiring within 24 hours");
      }

      // Check error rate
      if (watchHealth.errorRate > 10) {
        issues.push(`High error rate: ${watchHealth.errorRate}%`);
        recommendations.push(
          "Investigate watch errors and fix underlying issues",
        );
      }

      return {
        hasIssues: issues.length > 0,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error("Failed to check if system needs attention:", error);
      return {
        hasIssues: true,
        issues: ["Unable to check system health"],
        recommendations: ["Check network connectivity and authentication"],
      };
    }
  }

  /**
   * Performance Metrics
   */

  /**
   * Get processing performance metrics
   */
  static async getPerformanceMetrics(): Promise<{
    emailsProcessedPerHour: number;
    notificationsPerHour: number;
    averageProcessingTime: number;
    successRate: number;
  }> {
    try {
      const stats = await this.getStatistics();
      const watches = stats.watches;

      // Basic calculations (would need more detailed backend metrics)
      const totalProcessed = watches.totalEmailsProcessed;
      const totalNotifications = watches.totalNotifications;

      // Rough estimates (would need time-based data from backend)
      return {
        emailsProcessedPerHour: Math.round(totalProcessed / 24), // Assuming 24h window
        notificationsPerHour: Math.round(totalNotifications / 24),
        averageProcessingTime: 0, // Would need detailed timing data
        successRate:
          watches.totalActive > 0
            ? ((watches.totalActive - watches.withErrors) /
                watches.totalActive) *
              100
            : 0,
      };
    } catch (error) {
      console.error("Failed to get performance metrics:", error);
      return {
        emailsProcessedPerHour: 0,
        notificationsPerHour: 0,
        averageProcessingTime: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Get health status badge/color
   */
  static getHealthStatusColor(status: "healthy" | "unhealthy" | "unknown"): {
    color: string;
    badge: string;
    icon: string;
  } {
    switch (status) {
      case "healthy":
        return {
          color: "green",
          badge: "success",
          icon: "🟢",
        };
      case "unhealthy":
        return {
          color: "red",
          badge: "error",
          icon: "🔴",
        };
      default:
        return {
          color: "gray",
          badge: "unknown",
          icon: "⚪",
        };
    }
  }
}
