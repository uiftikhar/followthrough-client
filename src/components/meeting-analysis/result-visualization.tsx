"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MeetingAnalysisResponse } from "@/lib/api/meeting-analysis-service";
import {
  Topic,
  ActionItem,
  SentimentSegment,
  Decision,
  AnalysisResult,
} from "@/types/meeting-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit,
  ExternalLink,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/lib/analytics";

// Dynamically import AgentVisualization to avoid SSR issues
const AgentVisualization = dynamic(
  () => import("../../app/meeting-analysis/[sessionId]/agent-visualization"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading visualization...</p>
        </div>
      </div>
    )
  }
);

interface ResultVisualizationProps {
  data: MeetingAnalysisResponse;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ResultVisualization({
  data,
  isLoading = false,
  onRefresh,
}: ResultVisualizationProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const { toast } = useToast();
  const analytics = useAnalytics();

  // Helper function to get the actual data from results
  const getResultData = () => {
    if (!data) return null;

    // New response format with nested results
    if ("results" in data && data.results) {
      // Check for the most nested data structure
      if ("results" in data.results && data.results.results) {
        // For deeply nested structure
        return {
          ...data,
          ...data.results,
          // Preserve session ID from the top level
          sessionId: data.sessionId || data.results.sessionId,
        };
      }
      // For single level nesting
      return {
        ...data,
        ...data.results,
        // Preserve session ID from the top level
        sessionId: data.sessionId,
      };
    }

    // Legacy format where data is directly on the results object
    return data;
  };

  // Get the actual data
  const resultData = getResultData();

  // Track page view and analysis completion
  useEffect(() => {
    if (resultData?.sessionId) {
      analytics.trackPageView('meeting_analysis_results', {
        session_id: resultData.sessionId,
        status: resultData.status
      });

      if (resultData.status === 'completed') {
        analytics.trackAnalysisCompleted({
          session_id: resultData.sessionId,
          topics_found: resultData.topics?.length || 0,
          action_items_found: resultData.actionItems?.length || 0,
          sentiment_analyzed: !!resultData.sentiment,
          status: 'completed'
        });
      }
    }
  }, [resultData?.sessionId, resultData?.status, analytics]);

  // Show loading state
  if (isLoading && !resultData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Meeting Analysis Results</h2>
          <Badge variant="outline" className="px-3 py-1">
            Loading...
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get status badge
  const getStatusBadge = () => {
    switch (resultData?.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-gray-100">
            Pending
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-red-100 text-red-700"
          >
            <ArrowUpCircle className="h-3 w-3" /> High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-green-100 text-green-700"
          >
            <ArrowDownCircle className="h-3 w-3" /> Low
          </Badge>
        );
      default:
        return null;
    }
  };

  // Get status badge for action items
  const getActionStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-green-100 text-green-700"
          >
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            In Progress
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-gray-100 text-gray-700"
          >
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  // Add this helper function at the top of the component
  const getSentimentClass = (sentiment: any) => {
    // If sentiment is a number
    if (typeof sentiment === "number") {
      if (sentiment > 0.3)
        return "border-l-4 border-green-400 bg-green-50 text-green-700";
      if (sentiment < -0.3)
        return "border-l-4 border-red-400 bg-red-50 text-red-700";
      return "border-l-4 border-gray-400 bg-gray-50 text-gray-700";
    }

    // If sentiment is a string
    if (sentiment === "positive")
      return "border-l-4 border-green-400 bg-green-50 text-green-700";
    if (sentiment === "negative")
      return "border-l-4 border-red-400 bg-red-50 text-red-700";
    if (sentiment === "mixed")
      return "border-l-4 border-yellow-400 bg-yellow-50 text-yellow-700";

    // Default
    return "border-l-4 border-gray-400 bg-gray-50 text-gray-700";
  };

  // For the overall sentiment badge which has different styling
  const getSentimentBadgeClass = (sentiment: any) => {
    // If sentiment is a number
    if (typeof sentiment === "number") {
      if (sentiment > 0.3) return "bg-green-100 text-green-700";
      if (sentiment < -0.3) return "bg-red-100 text-red-700";
      return "bg-gray-100 text-gray-700";
    }

    // If sentiment is a string
    if (sentiment === "positive") return "bg-green-100 text-green-700";
    if (sentiment === "negative") return "bg-red-100 text-red-700";
    if (sentiment === "mixed") return "bg-yellow-100 text-yellow-700";

    // Default
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Meeting Analysis Results</h2>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>
      </div>

      {resultData?.errors && resultData.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Errors</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5">
              {resultData.errors.map((error, i) => (
                <li key={i}>
                  {error.step}: {error.error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(newTab) => {
        // Track tab switches
        analytics.trackTabSwitch(activeTab, newTab, resultData?.sessionId);
        setActiveTab(newTab);
      }}>
        <TabsList className="mb-4 grid grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {resultData?.summary ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {resultData.summary.meetingTitle || "Meeting Summary"}
                </CardTitle>
                <CardDescription>
                  Session ID: {resultData.sessionId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Executive Summary</h3>
                  <p className="mt-1">{resultData.summary.summary}</p>
                </div>

                {resultData.summary.decisions &&
                  resultData.summary.decisions.length > 0 && (
                    <div>
                      <h3 className="font-medium">Key Decisions</h3>
                      <ul className="mt-1 space-y-2">
                        {resultData.summary.decisions.map(
                          (decision: Decision, i: number) => (
                            <li key={i} className="rounded bg-gray-50 p-2">
                              <p className="font-semibold">{decision.title}</p>
                              <p>{decision.content}</p>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                {resultData.summary.next_steps &&
                  resultData.summary.next_steps.length > 0 && (
                    <div>
                      <h3 className="font-medium">Next Steps</h3>
                      <ul className="mt-1 list-disc pl-5">
                        {resultData.summary.next_steps.map(
                          (step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {resultData?.status === "in_progress" ||
                resultData?.status === "pending" ? (
                  <p>Summary is still being generated...</p>
                ) : (
                  <p>No summary available.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle>Topics</CardTitle>
              <CardDescription>
                {resultData?.topics
                  ? `${resultData.topics.length} topics identified`
                  : "No topics identified yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultData?.topics && resultData.topics.length > 0 ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {resultData.topics.map((topic, i) => (
                      <Card key={i}>
                        <CardHeader className="py-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">
                              {topic.name || topic.topic}
                            </CardTitle>
                            {topic.relevance && (
                              <Badge>Relevance: {topic.relevance}/10</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          {topic.description && <p>{topic.description}</p>}

                          {topic.keywords && topic.keywords.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-medium">Keywords:</h4>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {topic.keywords.map(
                                  (keyword: string, j: number) => (
                                    <Badge variant="outline" key={j}>
                                      {keyword}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {topic.subtopics && topic.subtopics.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-medium">
                                Subtopics:
                              </h4>
                              <ul className="mt-1 list-disc pl-5">
                                {topic.subtopics.map(
                                  (subtopic: string, j: number) => (
                                    <li key={j}>{subtopic}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}

                          {topic.main_participants &&
                            topic.main_participants.length > 0 && (
                              <div className="mt-3">
                                <h4 className="text-sm font-medium">
                                  Main Participants:
                                </h4>
                                <p className="mt-1">
                                  {topic.main_participants.join(", ")}
                                </p>
                              </div>
                            )}

                          {topic.duration && (
                            <div className="mt-3">
                              <h4 className="text-sm font-medium">Duration:</h4>
                              <p className="mt-1">{topic.duration}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  {resultData?.status === "in_progress" ||
                  resultData?.status === "pending"
                    ? "Topics are still being extracted..."
                    : "No topics were identified in this meeting."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="action-items">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Action Items</CardTitle>
                  <CardDescription>
                    {resultData?.actionItems
                      ? `${resultData.actionItems.length} action items identified`
                      : "No action items identified yet"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      analytics.trackFeatureUsed('action_items_edit_clicked');
                      toast({
                        title: "Edit Mode",
                        description: "Edit functionality will be available soon. You'll be able to modify action items directly.",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const itemCount = resultData?.actionItems?.length || 0;
                      analytics.trackJiraPush(itemCount, false, 'Not implemented yet');
                      analytics.trackFeatureUsed('jira_push_clicked', {
                        action_items_count: itemCount
                      });
                      
                      toast({
                        title: "Push to Jira",
                        description: `Preparing to push ${itemCount} action items to Jira...`,
                      });
                      // TODO: Implement actual Jira integration
                    }}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Push to Jira
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {resultData?.actionItems && resultData.actionItems.length > 0 ? (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resultData.actionItems.map((item, i) => (
                      <Card key={i} className="hover:shadow-lg transition-shadow duration-200 border border-gray-200 bg-white">
                        <CardContent className="p-4">
                          {/* Title */}
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                              {item.title || item.description}
                            </h3>
                          </div>

                          {/* Component/Epic Badge */}
                          <div className="mb-3 flex flex-wrap gap-1">
                            {item.component && (
                              <Badge 
                                className="text-xs px-2 py-1 bg-orange-100 text-orange-800 hover:bg-orange-100"
                                variant="secondary"
                              >
                                {item.component}
                              </Badge>
                            )}
                            {item.epic && (
                              <Badge 
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 hover:bg-blue-100"
                                variant="secondary"
                              >
                                {item.epic}
                              </Badge>
                            )}
                            {item.ticketType && (
                              <Badge 
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-800 hover:bg-purple-100"
                                variant="secondary"
                              >
                                {item.ticketType}
                              </Badge>
                            )}
                          </div>

                          {/* Status and Priority Row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {/* Status */}
                              {item.status && (
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    item.status.toLowerCase() === 'completed' ? 'bg-green-500' :
                                    item.status.toLowerCase() === 'in_progress' ? 'bg-blue-500' :
                                    item.status.toLowerCase() === 'pending' ? 'bg-gray-400' :
                                    'bg-red-500'
                                  }`} />
                                  <span className="text-xs text-gray-600 capitalize">
                                    {item.status.replace('_', ' ')}
                                  </span>
                                </div>
                              )}
                              
                              {/* Priority */}
                              {item.priority && (
                                <div className="flex items-center gap-1">
                                  {item.priority.toLowerCase() === 'high' && <ArrowUpCircle className="h-3 w-3 text-red-500" />}
                                  {item.priority.toLowerCase() === 'medium' && <ArrowUpCircle className="h-3 w-3 text-yellow-500" />}
                                  {item.priority.toLowerCase() === 'low' && <ArrowDownCircle className="h-3 w-3 text-green-500" />}
                                  <span className="text-xs text-gray-600">{item.priority}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Story Points */}
                            {item.storyPoints && (
                              <div className="text-xs text-gray-500 font-medium">
                                {item.storyPoints}
                              </div>
                            )}
                          </div>

                          {/* Bottom Row - Assignee and Ticket ID */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.assignee && (
                                <>
                                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                    <User className="h-3 w-3 text-gray-600" />
                                  </div>
                                  <span className="text-xs text-gray-600">{item.assignee}</span>
                                </>
                              )}
                            </div>
                            
                            {/* Mock Ticket ID */}
                            <div className="text-xs text-gray-500 font-mono">
                              TIS-{(i + 1).toString().padStart(2, '0')}
                            </div>
                          </div>

                          {/* Expandable Details (Hidden by default, can be toggled) */}
                          {(item.businessValue || item.acceptanceCriteria || item.technicalNotes || 
                            item.dependencies || item.risks || item.labels) && (
                            <details className="mt-3 group">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 list-none">
                                <span className="group-open:hidden">Show details</span>
                                <span className="hidden group-open:inline">Hide details</span>
                              </summary>
                              
                              <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                                {/* Business Value */}
                                {item.businessValue && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Business Value</h5>
                                    <p className="text-xs text-gray-600 bg-green-50 p-2 rounded">{item.businessValue}</p>
                                  </div>
                                )}

                                {/* Acceptance Criteria */}
                                {item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Acceptance Criteria</h5>
                                    <ul className="text-xs text-gray-600 space-y-1">
                                      {item.acceptanceCriteria.slice(0, 3).map((criteria: string, j: number) => (
                                        <li key={j} className="flex items-start">
                                          <CheckCircle2 className="h-3 w-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                          <span>{criteria}</span>
                                        </li>
                                      ))}
                                      {item.acceptanceCriteria.length > 3 && (
                                        <li className="text-gray-500">+{item.acceptanceCriteria.length - 3} more...</li>
                                      )}
                                    </ul>
                                  </div>
                                )}

                                {/* Labels */}
                                {item.labels && item.labels.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Labels</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {item.labels.slice(0, 4).map((label: string, j: number) => (
                                        <Badge key={j} variant="outline" className="text-xs px-1 py-0">
                                          {label}
                                        </Badge>
                                      ))}
                                      {item.labels.length > 4 && (
                                        <span className="text-xs text-gray-500">+{item.labels.length - 4}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  {resultData?.status === "in_progress" ||
                  resultData?.status === "pending"
                    ? "Action items are still being extracted..."
                    : "No action items were identified in this meeting."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualization">
          <Card>
            <CardHeader>
              <CardTitle>Agent Visualization</CardTitle>
              <CardDescription>
                Interactive visualization of the meeting analysis process and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultData?.sessionId ? (
                <div onMouseEnter={() => {
                  analytics.trackFeatureUsed('agent_visualization_viewed', {
                    session_id: resultData.sessionId
                  });
                }}>
                  <AgentVisualization sessionId={resultData.sessionId} />
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>Visualization not available - Session ID missing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>
                Emotional tone and key sentiments from the meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultData?.sentiment ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Overall Sentiment</h3>
                    <Badge
                      className={`px-3 py-1 ${getSentimentBadgeClass(
                        resultData.sentiment?.overall ||
                          resultData.sentiment?.overallSentiment,
                      )}`}
                    >
                      {(() => {
                        // Safely get the sentiment text
                        const sentimentText =
                          resultData.sentiment?.overall ||
                          resultData.sentiment?.overallSentiment ||
                          "neutral";

                        // If sentiment is a number, convert it to a string label
                        if (typeof sentimentText === "number") {
                          if (sentimentText > 0.3) return "Positive";
                          if (sentimentText < -0.3) return "Negative";
                          return "Neutral";
                        }

                        // Ensure it's a string before calling charAt
                        return typeof sentimentText === "string"
                          ? sentimentText.charAt(0).toUpperCase() +
                              sentimentText.slice(1)
                          : "Neutral";
                      })()}
                      {resultData.sentiment?.score !== undefined ||
                      resultData.sentiment?.sentimentScore !== undefined
                        ? ` (${(resultData.sentiment?.score ?? resultData.sentiment?.sentimentScore ?? 0).toFixed(2)})`
                        : typeof resultData.sentiment?.overall === "number"
                          ? ` (${Number(resultData.sentiment.overall).toFixed(2)})`
                          : ""}
                    </Badge>
                  </div>

                  {resultData.sentiment?.keyEmotions &&
                    resultData.sentiment.keyEmotions.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium">
                          Key Emotions
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          {resultData.sentiment.keyEmotions.map(
                            (emotion: string, i: number) => (
                              <Badge key={i} variant="outline">
                                {emotion}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {resultData.sentiment?.topicSentiments &&
                    resultData.sentiment.topicSentiments.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium">
                          Topic Sentiments
                        </h3>
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-3">
                            {resultData.sentiment.topicSentiments.map(
                              (topicSentiment, i) => (
                                <div
                                  key={i}
                                  className={`rounded-lg p-3 ${getSentimentClass(
                                    topicSentiment.sentiment,
                                  )}`}
                                >
                                  <div className="mb-1 flex justify-between">
                                    <span className="text-sm font-medium">
                                      {topicSentiment.topic}
                                    </span>
                                    <span className="text-xs">
                                      {(() => {
                                        // If sentiment is a number, convert to text
                                        if (
                                          typeof topicSentiment.sentiment ===
                                          "number"
                                        ) {
                                          if (topicSentiment.sentiment > 0.3)
                                            return "Positive";
                                          if (topicSentiment.sentiment < -0.3)
                                            return "Negative";
                                          return "Neutral";
                                        }

                                        // For string sentiment
                                        return typeof topicSentiment.sentiment ===
                                          "string"
                                          ? topicSentiment.sentiment
                                              .charAt(0)
                                              .toUpperCase() +
                                              topicSentiment.sentiment.slice(1)
                                          : "Neutral";
                                      })()}
                                      {topicSentiment.score !== undefined
                                        ? `(${
                                            typeof topicSentiment.score ===
                                            "number"
                                              ? topicSentiment.score.toFixed(2)
                                              : topicSentiment.score
                                          })`
                                        : typeof topicSentiment.sentiment ===
                                            "number"
                                          ? `(${Number(topicSentiment.sentiment).toFixed(2)})`
                                          : ""}
                                    </span>
                                  </div>
                                  <p className="text-sm">
                                    {topicSentiment.context}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                  {resultData.sentiment?.segments &&
                    resultData.sentiment.segments.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium">
                          Sentiment Segments
                        </h3>
                        <ScrollArea className="h-[300px] pr-4">
                          <div className="space-y-3">
                            {resultData.sentiment.segments.map((segment, i) => (
                              <div
                                key={i}
                                className={`rounded-lg p-3 ${getSentimentClass(
                                  segment.sentiment,
                                )}`}
                              >
                                <div className="mb-1 flex justify-between">
                                  <span className="text-sm font-medium">
                                    {segment.speaker
                                      ? `${segment.speaker}`
                                      : "Unknown Speaker"}
                                  </span>
                                  <span className="text-xs">
                                    {(() => {
                                      // If sentiment is a number, convert to text
                                      if (
                                        typeof segment.sentiment === "number"
                                      ) {
                                        if (segment.sentiment > 0.3)
                                          return "Positive";
                                        if (segment.sentiment < -0.3)
                                          return "Negative";
                                        return "Neutral";
                                      }

                                      // For string sentiment
                                      return typeof segment.sentiment ===
                                        "string"
                                        ? segment.sentiment
                                            .charAt(0)
                                            .toUpperCase() +
                                            segment.sentiment.slice(1)
                                        : "Neutral";
                                    })()}
                                    {segment.score !== undefined
                                      ? `(${
                                          typeof segment.score === "number"
                                            ? segment.score.toFixed(2)
                                            : segment.score
                                        })`
                                      : typeof segment.sentiment === "number"
                                        ? `(${Number(segment.sentiment).toFixed(2)})`
                                        : ""}
                                  </span>
                                </div>
                                <p className="text-sm">{segment.text}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">
                  {resultData?.status === "in_progress" ||
                  resultData?.status === "pending"
                    ? "Sentiment analysis is still in progress..."
                    : "No sentiment analysis available for this meeting."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
