"use client";

import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Database,
  Brain,
  Star,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  AnalysisResultDto,
  Topic,
  ActionItem,
  MeetingSummary,
  SentimentAnalysis,
  SentimentSegment,
  Decision,
  AnalysisError,
} from "@/types/meeting-analysis";

interface EnhancedResultVisualizationProps {
  data: AnalysisResultDto;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function EnhancedResultVisualization({
  data,
  isLoading = false,
  onRefresh,
}: EnhancedResultVisualizationProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showRAGDetails, setShowRAGDetails] = useState(false);

  // Show loading state
  if (isLoading && !data) {
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

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>
          No analysis data available. This might be a loading issue or the analysis hasn't started yet.
        </AlertDescription>
      </Alert>
    );
  }

  // Helper functions
  const getStatusBadge = () => {
    switch (data.status) {
      case "pending":
        return <Badge variant="outline" className="bg-gray-100">Pending</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-700">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-red-100 text-red-700">
            <ArrowUpCircle className="h-3 w-3" /> High
          </Badge>
        );
      case "medium":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Medium</Badge>;
      case "low":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-700">
            <ArrowDownCircle className="h-3 w-3" /> Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case "pending":
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 text-gray-700">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  const getSentimentClass = (score: number) => {
    if (score > 0.3) return "border-l-4 border-green-400 bg-green-50 text-green-700";
    if (score < -0.3) return "border-l-4 border-red-400 bg-red-50 text-red-700";
    return "border-l-4 border-yellow-400 bg-yellow-50 text-yellow-700";
  };

  const getSentimentBadgeClass = (score: number) => {
    if (score > 0.3) return "bg-green-100 text-green-700";
    if (score < -0.3) return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return "Positive";
    if (score < -0.3) return "Negative";
    return "Neutral";
  };

  // Show error state
  if (data.status === "failed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Meeting Analysis Results</h2>
          {getStatusBadge()}
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>
            {data.analysisErrors?.[0]?.error || "The analysis could not be completed."}
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="ml-2">
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show pending/in-progress state
  if (data.status !== "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Meeting Analysis Results</h2>
          {getStatusBadge()}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Analysis in Progress
            </CardTitle>
            <CardDescription>
              Please wait while we analyze your meeting transcript...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="text-sm font-medium mb-2">
                  Progress: {data.progress || 0}%
                </div>
                <Progress value={data.progress || 0} className="w-full" />
              </div>
              {onRefresh && (
                <Button variant="outline" onClick={onRefresh}>
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content with completed results
  return (
    <div className="space-y-6">
      {/* Header with comprehensive status info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meeting Analysis Results</h2>
          <p className="text-sm text-gray-500">
            Session: {data.sessionId} • 
            Completed: {data.endTime ? new Date(data.endTime).toLocaleString() : 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {data.metadata?.ragEnabled && (
            <Badge variant="outline" className="bg-purple-100 text-purple-700">
              <Database className="h-3 w-3 mr-1" />
              RAG Enhanced
            </Badge>
          )}
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>
      </div>

      {/* RAG Context Information */}
      {data.metadata?.ragEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              AI Context Enhancement
            </CardTitle>
            <CardDescription>
              This analysis was enhanced with relevant context from previous meetings and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                RAG Enabled
              </Badge>
              {data.metadata.ragUsed && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Context Applied
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>
            Comprehensive overview of the meeting analysis results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {data.topics?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Topics Identified</div>
              {data.topics && data.topics.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Avg relevance: {(data.topics.reduce((sum, t) => sum + (t.relevance || 0), 0) / data.topics.length).toFixed(1)}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {data.actionItems?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Action Items</div>
              {data.actionItems && data.actionItems.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {data.actionItems.filter(item => item.priority === 'high').length} high priority
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {data.summary?.decisions?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Key Decisions</div>
              {data.summary && (
                <div className="text-xs text-gray-500 mt-1">
                  {data.summary.next_steps?.length || 0} next steps
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {data.sentiment?.overall ? data.sentiment.overall.toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Overall Sentiment</div>
              {data.sentiment?.overall && (
                <Badge variant="outline" className={`text-xs mt-1 ${getSentimentBadgeClass(data.sentiment.overall)}`}>
                  {getSentimentLabel(data.sentiment.overall)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content for Comprehensive Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="metadata">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab with Summary */}
        <TabsContent value="overview" className="space-y-4">
          {data.summary ? (
            <Card>
              <CardHeader>
                <CardTitle>{data.summary.meetingTitle || "Meeting Summary"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.summary.summary && (
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Executive Summary</h4>
                    <p className="text-gray-700 leading-relaxed">{data.summary.summary}</p>
                  </div>
                )}

                {data.summary.decisions && data.summary.decisions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Key Decisions Made</h4>
                    <div className="space-y-4">
                      {data.summary.decisions.map((decision: Decision, index: number) => (
                        <div key={index} className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
                          <h5 className="font-medium text-blue-900 mb-2">{decision.title}</h5>
                          <p className="text-blue-800">{decision.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.summary.next_steps && data.summary.next_steps.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Next Steps</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {data.summary.next_steps.map((step: string, index: number) => (
                        <li key={index} className="text-gray-700">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No summary available for this analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Topics Tab with Comprehensive Details */}
        <TabsContent value="topics" className="space-y-4">
          {data.topics && data.topics.length > 0 ? (
            <div className="space-y-4">
              {data.topics.map((topic: Topic, index: number) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{topic.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {topic.relevance && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {topic.relevance}/10
                          </Badge>
                        )}
                        {topic.duration && (
                          <Badge variant="secondary">{topic.duration}</Badge>
                        )}
                      </div>
                    </div>
                    {topic.description && (
                      <CardDescription className="text-base leading-relaxed">
                        {topic.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Subtopics</h4>
                        <div className="flex flex-wrap gap-2">
                          {topic.subtopics.map((subtopic: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-sm">{subtopic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {topic.keywords && topic.keywords.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {topic.keywords.map((keyword: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-sm">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {topic.participants && topic.participants.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Active Participants</h4>
                        <div className="flex flex-wrap gap-2">
                          {topic.participants.map((participant: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-sm bg-blue-50 text-blue-700">
                              {participant}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No topics identified in this analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Action Items Tab with Full Context */}
        <TabsContent value="actions" className="space-y-4">
          {data.actionItems && data.actionItems.length > 0 ? (
            <div className="space-y-4">
              {data.actionItems.map((item: ActionItem, index: number) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold flex-1 text-lg leading-relaxed">{item.description}</h4>
                      <div className="flex items-center gap-2 ml-4">
                        {item.priority && getPriorityBadge(item.priority)}
                        {getActionStatusBadge(item.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      {item.assignee && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600">Assignee:</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {item.assignee}
                          </Badge>
                        </div>
                      )}
                      {item.deadline && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600">Deadline:</span>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            {item.deadline}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {item.context && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                        <span className="font-medium text-sm text-gray-700">Context:</span>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.context}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No action items identified in this analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sentiment Tab with Comprehensive Analysis */}
        <TabsContent value="sentiment" className="space-y-4">
          {data.sentiment ? (
            <div className="space-y-6">
              {/* Overall Sentiment */}
              {data.sentiment.overall !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Meeting Sentiment</CardTitle>
                    <CardDescription>
                      Aggregate emotional tone throughout the meeting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="text-4xl font-bold">
                        {data.sentiment.overall.toFixed(2)}
                      </div>
                      <div>
                        <Badge 
                          variant="outline" 
                          className={`text-lg px-4 py-2 ${getSentimentBadgeClass(data.sentiment.overall)}`}
                        >
                          {getSentimentLabel(data.sentiment.overall)}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-2">
                          Range: -1.0 (Very Negative) to +1.0 (Very Positive)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sentiment Segments */}
              {data.sentiment.segments && data.sentiment.segments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis by Segment</CardTitle>
                    <CardDescription>
                      Detailed breakdown of sentiment across different parts of the conversation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {data.sentiment.segments.map((segment: SentimentSegment, index: number) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg ${getSentimentClass(segment.score)}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge 
                                variant="outline" 
                                className={getSentimentBadgeClass(segment.score)}
                              >
                                {getSentimentLabel(segment.score)} ({segment.score.toFixed(2)})
                              </Badge>
                              <span className="text-xs text-gray-600">Segment {index + 1}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{segment.text}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No sentiment analysis available for this session.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Metadata Tab with Technical Details */}
        <TabsContent value="metadata" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium text-sm">Session ID:</span>
                  <p className="text-sm font-mono bg-gray-100 p-1 rounded mt-1">{data.sessionId}</p>
                </div>
                <div>
                  <span className="font-medium text-sm">Status:</span>
                  <div className="mt-1">{getStatusBadge()}</div>
                </div>
                <div>
                  <span className="font-medium text-sm">Progress:</span>
                  <p className="text-sm mt-1">{data.progress}%</p>
                </div>
                <div>
                  <span className="font-medium text-sm">Created:</span>
                  <p className="text-sm mt-1">{new Date(data.createdAt).toLocaleString()}</p>
                </div>
                {data.endTime && (
                  <div>
                    <span className="font-medium text-sm">Completed:</span>
                    <p className="text-sm mt-1">{new Date(data.endTime).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.metadata && (
                  <>
                    <div>
                      <span className="font-medium text-sm">RAG Enhanced:</span>
                      <Badge variant="outline" className={`ml-2 ${data.metadata.ragEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                        {data.metadata.ragEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {data.metadata.ragUsed && (
                      <div>
                        <span className="font-medium text-sm">RAG Applied:</span>
                        <Badge variant="outline" className="ml-2 bg-green-100 text-green-700">
                          Yes
                        </Badge>
                      </div>
                    )}
                    {data.metadata.processingTime && (
                      <div>
                        <span className="font-medium text-sm">Processing Time:</span>
                        <p className="text-sm mt-1">{data.metadata.processingTime}</p>
                      </div>
                    )}
                    {data.metadata.resultsSummary && (
                      <div>
                        <span className="font-medium text-sm">Results Summary:</span>
                        <div className="text-sm mt-1 space-y-1">
                          <p>Topics: {data.metadata.resultsSummary.topicsCount}</p>
                          <p>Action Items: {data.metadata.resultsSummary.actionItemsCount}</p>
                          <p>Has Summary: {data.metadata.resultsSummary.hasSummary ? 'Yes' : 'No'}</p>
                          <p>Has Sentiment: {data.metadata.resultsSummary.hasSentiment ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Error Information if any */}
          {data.analysisErrors && data.analysisErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Analysis Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.analysisErrors.map((error: AnalysisError, index: number) => (
                    <div key={index} className="border-l-4 border-red-400 bg-red-50 p-3 rounded-r">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-red-800">Step: {error.step}</span>
                        <span className="text-xs text-red-600">{error.timestamp}</span>
                      </div>
                      <p className="text-red-700 text-sm">{error.error}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 