/**
 * Gmail AI Triage Service
 *
 * Handles AI-powered email triage, classification, and analysis
 * Focuses on email processing and AI results
 */

import { HttpClient } from "./http-client";

/**
 * Email Triage DTOs
 */
export interface TestEmailTriageDto {
  subject: string;
  from: string;
  body: string;
  to?: string;
}

export interface EmailMetadata {
  subject: string;
  from: string;
  to: string;
  date: string;
  messageId: string;
  gmailSource: boolean;
  userId: string;
  headers?: Record<string, string>;
  labels?: string[];
}

export interface EmailTriageResponse {
  success: boolean;
  message: string;
  sessionId?: string;
  result?: {
    status: "pending" | "processing" | "completed" | "failed";
    sessionId: string;
    isProcessing: boolean;
  };
  testEmail?: {
    id: string;
    body: string;
    metadata: EmailMetadata;
  };
  note?: string;
  error?: string;
}

export interface EmailTriageResult {
  classification: {
    priority: "urgent" | "high" | "normal" | "low";
    category:
      | "bug_report"
      | "feature_request"
      | "support"
      | "billing"
      | "other";
    reasoning: string;
    confidence: number;
    urgency?: "immediate" | "same_day" | "within_week" | "when_possible";
  };
  summary: {
    problem: string;
    context: string;
    ask: string;
    summary: string;
  };
  replyDraft: {
    subject: string;
    body: string;
    tone: "professional" | "friendly" | "formal" | "empathetic";
    next_steps: string[];
  };
}

export interface TriageResultResponse {
  success: boolean;
  sessionId: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: EmailTriageResult;
  processedAt?: string;
  error?: string;
  message?: string;
}

export interface BatchTriageRequest {
  emails: TestEmailTriageDto[];
  batchId?: string;
}

export interface BatchTriageResponse {
  success: boolean;
  batchId: string;
  message: string;
  totalEmails: number;
  results?: {
    sessionId: string;
    status: "pending" | "processing" | "completed" | "failed";
  }[];
  error?: string;
}

export interface TriageAnalytics {
  totalProcessed: number;
  successRate: number;
  averageConfidence: number;
  priorityDistribution: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  categoryDistribution: {
    bug_report: number;
    feature_request: number;
    support: number;
    billing: number;
    other: number;
  };
  averageProcessingTime: number;
}

/**
 * Gmail AI Triage Service
 */
export class GmailTriageService {
  /**
   * Email Triage Operations
   */

  /**
   * Test email triage with sample data
   */
  static async testEmailTriage(
    dto: TestEmailTriageDto,
  ): Promise<EmailTriageResponse> {
    try {
      const response = await HttpClient.post("/gmail/client/test-triage", dto);
      return await HttpClient.parseJsonResponse<EmailTriageResponse>(response);
    } catch (error) {
      console.error("Failed to test email triage:", error);
      throw error;
    }
  }

  /**
   * Get triage result by session ID
   */
  static async getTriageResult(
    sessionId: string,
  ): Promise<TriageResultResponse> {
    try {
      const response = await HttpClient.get(
        `/gmail/client/triage-result/${sessionId}`,
      );
      return await HttpClient.parseJsonResponse<TriageResultResponse>(response);
    } catch (error) {
      console.error("Failed to get triage result:", error);
      throw error;
    }
  }

  /**
   * Process batch of emails for triage
   */
  static async batchTriage(
    request: BatchTriageRequest,
  ): Promise<BatchTriageResponse> {
    try {
      const response = await HttpClient.post(
        "/gmail/client/batch-triage",
        request,
      );
      return await HttpClient.parseJsonResponse<BatchTriageResponse>(response);
    } catch (error) {
      console.error("Failed to process batch triage:", error);
      throw error;
    }
  }

  /**
   * Get batch triage results
   */
  static async getBatchTriageResults(batchId: string): Promise<{
    success: boolean;
    batchId: string;
    results: TriageResultResponse[];
    completed: number;
    pending: number;
    failed: number;
  }> {
    try {
      const response = await HttpClient.get(
        `/gmail/client/batch-triage/${batchId}`,
      );
      return await HttpClient.parseJsonResponse<{
        success: boolean;
        batchId: string;
        results: TriageResultResponse[];
        completed: number;
        pending: number;
        failed: number;
      }>(response);
    } catch (error) {
      console.error("Failed to get batch triage results:", error);
      throw error;
    }
  }

  /**
   * Cancel ongoing triage session
   */
  static async cancelTriage(
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await HttpClient.delete(
        `/gmail/client/triage/${sessionId}`,
      );
      return await HttpClient.parseJsonResponse<{
        success: boolean;
        message: string;
      }>(response);
    } catch (error) {
      console.error("Failed to cancel triage:", error);
      throw error;
    }
  }

  /**
   * Triage Analytics and Insights
   */

  /**
   * Get triage analytics for a user
   */
  static async getTriageAnalytics(
    timeframe: "24h" | "7d" | "30d" = "7d",
  ): Promise<TriageAnalytics> {
    try {
      const response = await HttpClient.get(
        `/gmail/client/triage-analytics?timeframe=${timeframe}`,
      );
      return await HttpClient.parseJsonResponse<TriageAnalytics>(response);
    } catch (error) {
      console.error("Failed to get triage analytics:", error);
      throw error;
    }
  }

  /**
   * Get triage history for a user
   */
  static async getTriageHistory(
    options: {
      limit?: number;
      offset?: number;
      status?: "completed" | "failed" | "all";
    } = {},
  ): Promise<{
    success: boolean;
    results: TriageResultResponse[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.status) params.append("status", options.status);

      const endpoint = `/gmail/client/triage-history${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await HttpClient.get(endpoint);
      return await HttpClient.parseJsonResponse<{
        success: boolean;
        results: TriageResultResponse[];
        total: number;
        hasMore: boolean;
      }>(response);
    } catch (error) {
      console.error("Failed to get triage history:", error);
      throw error;
    }
  }

  /**
   * Configuration and Settings
   */

  /**
   * Update triage settings
   */
  static async updateTriageSettings(settings: {
    autoTriage?: boolean;
    priorityThreshold?: number;
    categoryFilters?: string[];
    responseGeneration?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await HttpClient.put(
        "/gmail/client/triage-settings",
        settings,
      );
      return await HttpClient.parseJsonResponse<{
        success: boolean;
        message: string;
      }>(response);
    } catch (error) {
      console.error("Failed to update triage settings:", error);
      throw error;
    }
  }

  /**
   * Get current triage settings
   */
  static async getTriageSettings(): Promise<{
    success: boolean;
    settings: {
      autoTriage: boolean;
      priorityThreshold: number;
      categoryFilters: string[];
      responseGeneration: boolean;
    };
  }> {
    try {
      const response = await HttpClient.get("/gmail/client/triage-settings");
      return await HttpClient.parseJsonResponse<{
        success: boolean;
        settings: {
          autoTriage: boolean;
          priorityThreshold: number;
          categoryFilters: string[];
          responseGeneration: boolean;
        };
      }>(response);
    } catch (error) {
      console.error("Failed to get triage settings:", error);
      throw error;
    }
  }

  /**
   * Utility Methods
   */

  /**
   * Validate email for triage
   */
  static validateEmailForTriage(email: TestEmailTriageDto): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!email.subject?.trim()) {
      errors.push("Subject is required");
    }

    if (!email.from?.trim()) {
      errors.push("From email is required");
    }

    if (!email.body?.trim()) {
      errors.push("Email body is required");
    }

    // Validate email format
    if (email.from && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.from)) {
      errors.push("Invalid from email format");
    }

    if (email.to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.to)) {
      errors.push("Invalid to email format");
    }

    // Check length limits
    if (email.subject && email.subject.length > 500) {
      errors.push("Subject too long (max 500 characters)");
    }

    if (email.body && email.body.length > 50000) {
      errors.push("Email body too long (max 50,000 characters)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get priority color/badge for UI display
   */
  static getPriorityDisplay(
    priority: EmailTriageResult["classification"]["priority"],
  ): {
    color: string;
    badge: string;
    icon: string;
  } {
    switch (priority) {
      case "urgent":
        return {
          color: "red",
          badge: "destructive",
          icon: "🚨",
        };
      case "high":
        return {
          color: "orange",
          badge: "warning",
          icon: "⚠️",
        };
      case "normal":
        return {
          color: "blue",
          badge: "default",
          icon: "📧",
        };
      case "low":
        return {
          color: "gray",
          badge: "secondary",
          icon: "📥",
        };
      default:
        return {
          color: "gray",
          badge: "outline",
          icon: "❓",
        };
    }
  }

  /**
   * Get category display information
   */
  static getCategoryDisplay(
    category: EmailTriageResult["classification"]["category"],
  ): {
    label: string;
    icon: string;
    description: string;
  } {
    switch (category) {
      case "bug_report":
        return {
          label: "Bug Report",
          icon: "🐛",
          description: "Technical issue or bug report",
        };
      case "feature_request":
        return {
          label: "Feature Request",
          icon: "💡",
          description: "Request for new features or enhancements",
        };
      case "support":
        return {
          label: "Support",
          icon: "🤝",
          description: "General support or help request",
        };
      case "billing":
        return {
          label: "Billing",
          icon: "💳",
          description: "Billing, payment, or subscription related",
        };
      case "other":
        return {
          label: "Other",
          icon: "📝",
          description: "General inquiry or other category",
        };
      default:
        return {
          label: "Unknown",
          icon: "❓",
          description: "Category not determined",
        };
    }
  }

  /**
   * Calculate confidence level description
   */
  static getConfidenceDescription(confidence: number): {
    level: "very_high" | "high" | "medium" | "low" | "very_low";
    description: string;
    color: string;
  } {
    if (confidence >= 0.9) {
      return {
        level: "very_high",
        description: "Very High Confidence",
        color: "green",
      };
    } else if (confidence >= 0.75) {
      return {
        level: "high",
        description: "High Confidence",
        color: "blue",
      };
    } else if (confidence >= 0.6) {
      return {
        level: "medium",
        description: "Medium Confidence",
        color: "yellow",
      };
    } else if (confidence >= 0.4) {
      return {
        level: "low",
        description: "Low Confidence",
        color: "orange",
      };
    } else {
      return {
        level: "very_low",
        description: "Very Low Confidence",
        color: "red",
      };
    }
  }
}
