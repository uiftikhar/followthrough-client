/**
 * Health Check Service
 *
 * Provides methods to check system health and service status
 */
import { HttpClient } from "./http-client";
import { API_CONFIG } from "../../config/api";

/**
 * Basic health response
 */
export interface HealthStatus {
  status: "OK" | "DEGRADED" | "ERROR";
  timestamp?: string;
}

/**
 * Detailed health response
 */
export interface DetailedHealthStatus extends HealthStatus {
  uptime: number;
  env: string;
  memory: Record<string, number>;
  cpu: Record<string, number>;
  services?: {
    name: string;
    status: "OK" | "DEGRADED" | "ERROR";
    message?: string;
  }[];
}

/**
 * Service status response
 */
export interface ServiceStatusResponse {
  status: "OK" | "DEGRADED" | "ERROR";
  services: {
    name: string;
    status: "OK" | "DEGRADED" | "ERROR";
    details?: Record<string, any>;
  }[];
}

/**
 * Health Service for checking system status
 */
export const HealthService = {
  /**
   * Check basic health status
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await HttpClient.get(API_CONFIG.endpoints.health.base);
      return await HttpClient.parseJsonResponse<HealthStatus>(response);
    } catch (error) {
      console.error("Health check failed:", error);
      return { status: "ERROR" };
    }
  },

  /**
   * Check detailed health status
   */
  async checkDetailedHealth(): Promise<DetailedHealthStatus> {
    try {
      const response = await HttpClient.get(
        API_CONFIG.endpoints.health.detailed,
      );
      return await HttpClient.parseJsonResponse<DetailedHealthStatus>(response);
    } catch (error) {
      console.error("Detailed health check failed:", error);
      return {
        status: "ERROR",
        uptime: 0,
        env: "unknown",
        memory: {},
        cpu: {},
      };
    }
  },

  /**
   * Check service status
   */
  async checkServiceStatus(): Promise<ServiceStatusResponse> {
    try {
      const response = await HttpClient.get(
        API_CONFIG.endpoints.health.serviceStatus,
      );
      return await HttpClient.parseJsonResponse<ServiceStatusResponse>(
        response,
      );
    } catch (error) {
      console.error("Service status check failed:", error);
      return {
        status: "ERROR",
        services: [],
      };
    }
  },
};
