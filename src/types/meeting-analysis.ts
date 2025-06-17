/**
 * Meeting Analysis Response Types
 * Updated to match the integration guide API structure exactly
 */

// Core Topic structure - matches integration guide
export interface Topic {
  name: string;                // "Production Bug Resolution"
  description: string;         // Detailed explanation
  relevance: number;           // 1-10 importance score
  subtopics: string[];         // ["Root cause analysis", "Immediate fixes"]
  keywords: string[];          // ["production bug", "CRM sync"]
  participants: string[];      // ["Emily", "Adrian", "Sophia"]
  duration?: string;           // "25 minutes"
}

// Action Item structure - matches integration guide
export interface ActionItem {
  description: string;         // "Debug and patch backend mapping logic"
  assignee?: string;           // "Emily and Adrian"
  deadline?: string;           // "EOD today"
  status: "pending" | "in_progress" | "completed"; // Status enum
  priority?: "high" | "medium" | "low";            // Priority enum
  context?: string;            // Why this action is needed
}

// Meeting Summary structure - matches integration guide
export interface Decision {
  title: string;             // "Deploy Hotfix by End of Day"
  content: string;           // Detailed decision explanation
}

export interface MeetingSummary {
  meetingTitle: string;        // "Production Bug Resolution"
  summary: string;             // Brief meeting summary
  decisions: Decision[];       // List of decisions made
  next_steps?: string[];       // Next steps if identified
}

// Sentiment Analysis structures - matches integration guide
export interface SentimentSegment {
  text: string;              // Text segment
  score: number;             // Sentiment score for segment
}

export interface SentimentAnalysis {
  overall: number;             // Overall sentiment score (-1 to 1)
  segments: SentimentSegment[];
}

// Analysis Error structure - matches integration guide
export interface AnalysisError {
  step: string;                // Which analysis step failed
  error: string;               // Error description
  timestamp: string;           // When the error occurred
}

// Main Analysis Result DTO - matches integration guide exactly
export interface AnalysisResultDto {
  sessionId: string;
  userId: string;              // Added missing field
  status: "completed" | "failed" | "pending" | "in_progress";
  progress: number;            // 0-100
  startTime: string;           // ISO timestamp - Added missing field
  endTime?: string;            // ISO timestamp - Added missing field
  transcript: string;          // Added missing field
  
  // Analysis Results (only when status === "completed")
  topics: Topic[];
  actionItems: ActionItem[];
  summary: MeetingSummary;
  sentiment: SentimentAnalysis;
  
  // Error Information - Updated field name to match guide
  analysisErrors?: AnalysisError[];
  
  // Metadata - Updated to match guide structure
  metadata: {
    title?: string;
    participants?: string[];
    date?: string;
    processingTime?: string;
    ragEnabled?: boolean;
    ragUsed?: boolean;
    analysisCompletedAt?: string;
    resultsSummary?: {
      topicsCount: number;
      actionItemsCount: number;
      hasSummary: boolean;
      hasSentiment: boolean;
    };
  };
  
  // MongoDB timestamps
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

// Analysis Start Response - matches integration guide
export interface AnalysisStartResponse {
  sessionId: string;
  status: "pending";
  message: string;
}

// Analysis Request - matches integration guide
export interface AnalysisRequest {
  transcript: string;
  metadata?: {
    title?: string;
    participants?: string[];
    date?: string;
    duration?: string;
    meetingType?: string;
  };
}

// Main response interface - this is what the API returns
export interface MeetingAnalysisResponse extends AnalysisResultDto {}

// Legacy interfaces for backward compatibility
export interface AnalysisResult extends AnalysisResultDto {}

// Keep some legacy types for backward compatibility
export interface TopicSentiment {
  topic: string;
  sentiment: string;
  score: number;
  context: string;
}

export interface ToneShift {
  from: string;
  to: string;
  approximate_time?: string;
  trigger?: string;
}

// RAG Context structure
export interface RetrievedContext {
  id: string;
  content: string;
  score: number;
}

// Re-export for convenience
export type { AnalysisResultDto as MeetingAnalysisState };
export type { AnalysisResultDto as AnalysisResults };
