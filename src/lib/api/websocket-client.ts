/**
 * WebSocket Client for Gmail Email Triage System
 *
 * Provides centralized WebSocket connection management with:
 * - JWT authentication
 * - Typed event handling
 * - Automatic reconnection
 * - Subscription management
 */


import { io, Socket } from "socket.io-client";

// Environment configuration
const WS_BASE_URL =
  // TODO: Change to production URL insterad of ngrok URL everywhere
  process.env.NEXT_PUBLIC_WS_URL || "wss://followthrough-server-production.up.railway.app";

/**
 * WebSocket Event Types - Client to Server
 */
export interface SubscribeEvent {
  userId: string;
  emailAddress?: string;
}

export interface UnsubscribeEvent {
  userId: string;
  emailAddress?: string;
}

export interface StatusRequestEvent {
  // No payload required
}

export interface TestEvent {
  // No payload required
}

/**
 * WebSocket Event Types - Server to Client
 */
export interface ConnectedEvent {
  message: string;
  clientId: string;
  timestamp: string;
}

export interface SubscribedEvent {
  message: string;
  userId: string;
  emailAddress?: string;
  rooms: string[];
  timestamp: string;
}

export interface TriageStartedEvent {
  type: "triage.started";
  sessionId: string;
  emailId: string;
  emailAddress: string;
  timestamp: string;
}

export interface TriageCompletedEvent {
  type: "triage.completed";
  sessionId: string;
  emailId: string;
  emailAddress: string;
  result: EmailTriageResult;
  timestamp: string;
}

export interface TriageFailedEvent {
  type: "triage.failed";
  emailId: string;
  emailAddress: string;
  error: string;
  timestamp: string;
}

export interface NotificationEvent {
  type: "email_triage_completed" | "email_triage_failed" | "system_alert";
  sessionId?: string;
  emailAddress?: string;
  summary: string;
  timestamp: string;
}

export interface StatusResponseEvent {
  clientId: string;
  connectedClients: number;
  rooms: string[];
  timestamp: string;
}

export interface TestNotificationEvent {
  message: string;
  timestamp: string;
}

/**
 * Email Triage Result Types
 */
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

/**
 * Connection states
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * WebSocket Client Configuration
 */
export interface WebSocketConfig {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  debug?: boolean;
}

/**
 * Event listeners type
 */
export type EventListener<T = any> = (data: T) => void;

/**
 * Centralized WebSocket Client for Email Triage System
 */
export class WebSocketClient {
  private socket: Socket | null = null;
  private jwtToken: string | null = null;
  private connectionState: ConnectionState = "disconnected";
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventListeners = new Map<string, Set<EventListener>>();
  private isManualDisconnect = false;

  // Default configuration
  private static readonly DEFAULT_CONFIG: Required<WebSocketConfig> = {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    debug: false,
  };

  constructor(config: WebSocketConfig = {}) {
    this.config = { ...WebSocketClient.DEFAULT_CONFIG, ...config };

    // Get JWT token from storage
    this.jwtToken = this.getStoredToken();
  }

  /**
   * Get JWT token from localStorage
   */
  private getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("jwt_token");
  }

  /**
   * Set JWT token for authentication
   */
  public setToken(token: string): void {
    this.jwtToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("jwt_token", token);
    }
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.socket?.connected) {
      this.log("Already connected");
      return;
    }

    if (!this.jwtToken) {
      throw new Error("JWT token required for WebSocket connection");
    }

    this.connectionState = "connecting";
    this.isManualDisconnect = false;

    try {
      this.log("Connecting to WebSocket...", `${WS_BASE_URL}/gmail-notifications`);

      // Create socket connection with JWT auth
      this.socket = io(`${WS_BASE_URL}/gmail-notifications`, {
        transports: ["websocket"],
        auth: {
          token: this.jwtToken,
        },
        timeout: 15000, // Increased timeout
        forceNew: true, // Force new connection
        upgrade: true,
        rememberUpgrade: false,
      });

      this.setupEventHandlers();

      // Wait for connection with better error handling
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.log("Connection timeout after 15 seconds");
          reject(new Error("Connection timeout - server may be unavailable"));
        }, 15000);

        this.socket!.on("connect", () => {
          clearTimeout(timeout);
          this.log("✅ Successfully connected to WebSocket");
          resolve();
        });

        this.socket!.on("connect_error", (error) => {
          clearTimeout(timeout);
          this.log("❌ Connection error:", error);
          reject(new Error(`Connection failed: ${error.message || error}`));
        });
      });
    } catch (error) {
      this.connectionState = "error";
      this.log("Connection failed:", error);

      if (this.config.autoReconnect && !this.isManualDisconnect) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = "disconnected";
    this.reconnectAttempts = 0;
    this.log("Disconnected");
  }

  /**
   * Setup event handlers for socket connection
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      this.connectionState = "connected";
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.log("✅ WebSocket connected:", this.socket!.id);

      // Emit connected event to listeners
      this.emitToListeners("connected", {
        message: "WebSocket connected",
        clientId: this.socket!.id,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on("disconnect", (reason) => {
      this.connectionState = "disconnected";
      this.log("WebSocket disconnected:", reason);

      // Emit disconnected event to listeners
      this.emitToListeners("disconnected", {
        reason,
        timestamp: new Date().toISOString(),
      });

      // Auto-reconnect if not manual disconnect
      if (this.config.autoReconnect && !this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      this.connectionState = "error";
      this.log("Connection error:", error);

      this.emitToListeners("error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      if (this.config.autoReconnect && !this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    // Email triage events
    this.socket.on("subscribed", (data: SubscribedEvent) => {
      this.log("Subscription confirmed:", data);
      this.emitToListeners("subscribed", data);
    });

    this.socket.on("triage.started", (data: TriageStartedEvent) => {
      this.log("Triage started:", data);
      this.emitToListeners("triage.started", data);
    });

    this.socket.on("triage.completed", (data: TriageCompletedEvent) => {
      this.log("Triage completed:", data);
      this.emitToListeners("triage.completed", data);
    });

    this.socket.on("triage.failed", (data: TriageFailedEvent) => {
      this.log("Triage failed:", data);
      this.emitToListeners("triage.failed", data);
    });

    this.socket.on("notification", (data: NotificationEvent) => {
      this.log("Notification received:", data);
      this.emitToListeners("notification", data);
    });

    this.socket.on("status.response", (data: StatusResponseEvent) => {
      this.log("Status response:", data);
      this.emitToListeners("status.response", data);
    });

    this.socket.on("test.notification", (data: TestNotificationEvent) => {
      this.log("Test notification:", data);
      this.emitToListeners("test.notification", data);
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log("Max reconnection attempts reached");
      this.emitToListeners("max_reconnect_reached", {
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.clearReconnectTimer();

    const delay = this.config.reconnectInterval * (this.reconnectAttempts + 1);
    this.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`,
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      try {
        await this.connect();
      } catch (error) {
        this.log("Reconnection failed:", error);
      }
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Subscribe to email triage notifications
   */
  public subscribe(params: SubscribeEvent): void {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    this.log("Subscribing to notifications:", params);
    this.socket.emit("subscribe", params);
  }

  /**
   * Unsubscribe from email triage notifications
   */
  public unsubscribe(params: UnsubscribeEvent): void {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    this.log("Unsubscribing from notifications:", params);
    this.socket.emit("unsubscribe", params);
  }

  /**
   * Request connection status
   */
  public requestStatus(): void {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    this.socket.emit("status");
  }

  /**
   * Send test notification
   */
  public sendTest(): void {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }

    this.socket.emit("test");
  }

  /**
   * Add event listener
   */
  public on<T = any>(event: string, listener: EventListener<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  public off<T = any>(event: string, listener: EventListener<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  /**
   * Emit event to registered listeners
   */
  private emitToListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          this.log("Error in event listener:", error);
        }
      });
    }
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return (
      this.connectionState === "connected" && this.socket?.connected === true
    );
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log("[WebSocketClient]", ...args);
    }
  }
}

/**
 * Singleton instance for global use
 */
let webSocketClientInstance: WebSocketClient | null = null;

/**
 * Get singleton WebSocket client instance
 */
export function getWebSocketClient(config?: WebSocketConfig): WebSocketClient {
  if (!webSocketClientInstance) {
    webSocketClientInstance = new WebSocketClient(config);
  }
  return webSocketClientInstance;
}

/**
 * Helper function to create authenticated WebSocket connection
 */
export async function connectToEmailTriage(
  userId: string,
  emailAddress?: string,
  config?: WebSocketConfig,
): Promise<WebSocketClient> {
  const client = getWebSocketClient(config);

  await client.connect();

  // Subscribe to notifications
  client.subscribe({ userId, emailAddress });

  return client;
}
