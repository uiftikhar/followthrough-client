"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, CheckCircle2, Brain, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MeetingAnalysisService,
  AnalyzeTranscriptRequest,
} from "@/lib/api/meeting-analysis-service";
import { useAuth } from "@/context/AuthContext";

export default function MeetingAnalysisPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [transcript, setTranscript] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [duration, setDuration] = useState("");

  // Analysis state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to be loaded before making decisions
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading]);

  const validateForm = (): boolean => {
    setValidationError(null);

    // Validate transcript
    const transcriptValidation = MeetingAnalysisService.validateTranscript(transcript);
    if (!transcriptValidation.valid) {
      setValidationError(transcriptValidation.error || "Invalid transcript");
      return false;
    }

    // Validate participants format if provided
    if (participants.trim() && participants.includes(";")) {
      setValidationError("Please separate participants with commas, not semicolons");
      return false;
    }

    return true;
  };

  const parseParticipants = (participantsStr: string): string[] => {
    if (!participantsStr.trim()) return [];
    return participantsStr
      .split(",")
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  const handleAnalyzeTranscript = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setError("You must be logged in to analyze transcripts");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setIsPolling(false);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setStatus("Preparing RAG-enhanced analysis...");

    try {
      // Prepare the analysis request with RAG enabled by default
      const request: AnalyzeTranscriptRequest = {
        transcript: transcript.trim(),
        metadata: {
          title: meetingTitle.trim() || "Meeting Analysis",
          participants: parseParticipants(participants),
          date: meetingDate ? new Date(meetingDate).toISOString() : new Date().toISOString(),
          duration: duration.trim() || undefined,
          useRAG: true, // Always enable RAG for production use
        }
      };

      console.log("Submitting RAG-enhanced analysis request:", {
        transcriptLength: request.transcript.length,
        metadata: request.metadata
      });

      // Submit the analysis
      setStatus("Submitting to AI agents with RAG enhancement...");
      const result = await MeetingAnalysisService.analyzeTranscript(request);
      
      console.log("RAG-enhanced analysis started:", result);
      setCurrentSessionId(result.sessionId);
      setIsSubmitting(false);
      setIsPolling(true);
      setStatus("AI agents analyzing transcript with RAG context...");
      setProgress(10);

      // Start polling for results with progress updates
      const pollForResults = async () => {
        let attempts = 0;
        const maxAttempts = 150; // 5 minutes max
        const interval = 2000; // 2 seconds

        while (attempts < maxAttempts) {
          attempts++;
          
          try {
            const analysisResult = await MeetingAnalysisService.getAnalysisResults(result.sessionId);
            
            // Update progress based on status
            let newProgress = 10;
            switch (analysisResult.status) {
              case "pending":
                newProgress = Math.min(20 + (attempts * 2), 40);
                setStatus("Analysis queued in RAG-enabled workflow...");
                break;
              case "in_progress":
                newProgress = Math.min(40 + (attempts * 3), 90);
                setStatus("AI agents processing with contextual enhancement...");
                break;
              case "completed":
                newProgress = 100;
                setStatus("RAG-enhanced analysis completed!");
                setIsPolling(false);
                setSuccess("Analysis completed successfully with contextual enhancement!");
                
                // Navigate to results after a short delay
                setTimeout(() => {
                  router.push(`/meeting-analysis/${result.sessionId}`);
                }, 1500);
                return;
              case "failed":
                setIsPolling(false);
                const errorMsg = analysisResult.analysisErrors?.[0]?.error || "Analysis failed";
                throw new Error(errorMsg);
            }
            
            setProgress(newProgress);
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, interval));
            
          } catch (pollError) {
            console.error(`Poll attempt ${attempts} failed:`, pollError);
            
            // Continue polling for network errors, but stop for other errors
            if (pollError instanceof Error && 
                !pollError.message.includes('fetch') && 
                !pollError.message.includes('network')) {
              setIsPolling(false);
              throw pollError;
            }
            
            // For network errors, just wait and continue
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }
        
        // Timeout reached
        setIsPolling(false);
        throw new Error("Analysis timeout - please check results manually");
      };

      await pollForResults();

    } catch (error: any) {
      console.error("Analysis submission error:", error);
      setIsSubmitting(false);
      setIsPolling(false);
      setError(error?.message || "Failed to submit transcript for analysis");
      setStatus("");
      setProgress(0);
    }
  };

  const resetForm = () => {
    setTranscript("");
    setMeetingTitle("");
    setParticipants("");
    setMeetingDate(new Date().toISOString().split("T")[0]);
    setDuration("");
    setError(null);
    setSuccess(null);
    setValidationError(null);
    setProgress(0);
    setStatus("");
    setCurrentSessionId(null);
    setIsSubmitting(false);
    setIsPolling(false);
  };

  const isProcessing = isSubmitting || isPolling;

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-3xl font-bold">Meeting Analysis</h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (authChecked && !isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-3xl font-bold">Meeting Analysis</h1>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to use the AI-powered meeting analysis features
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="mb-4 text-center">
              You need to be logged in to analyze meeting transcripts with RAG enhancement
            </p>
            <Button onClick={() => router.push("/auth/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI-Powered Meeting Analysis</h1>
        <p className="text-gray-600 mt-2">
          Analyze your meeting transcripts with AI agents and RAG enhancement for contextual insights,
          topic extraction, action item detection, sentiment analysis, and comprehensive summaries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analysis Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>Start New Analysis</CardTitle>
                  <CardDescription>
                    Submit your meeting transcript for AI-powered analysis with contextual enhancement
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalyzeTranscript} className="space-y-6">
                {/* Error Messages */}
                {(error || validationError) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error || validationError}</AlertDescription>
                  </Alert>
                )}

                {/* Success Message */}
                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Success</AlertTitle>
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}

                {/* Progress Indicator */}
                {isProcessing && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {status}
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {currentSessionId && (
                      <p className="text-xs text-gray-600">Session ID: {currentSessionId}</p>
                    )}
                  </div>
                )}

                {/* Meeting Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meetingTitle">Meeting Title</Label>
                    <Input
                      id="meetingTitle"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="e.g., Weekly Team Standup"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meetingDate">Meeting Date</Label>
                    <Input
                      id="meetingDate"
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="participants">
                      Participants (comma-separated)
                    </Label>
                    <Input
                      id="participants"
                      value={participants}
                      onChange={(e) => setParticipants(e.target.value)}
                      placeholder="John Doe, Jane Smith, Bob Johnson"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (optional)</Label>
                    <Input
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 45 minutes, 1 hour"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Transcript Input */}
                <div className="space-y-2">
                  <Label htmlFor="transcript">
                    Meeting Transcript *
                    <span className="text-sm text-gray-500 ml-2">
                      ({transcript.length}/100,000 characters)
                    </span>
                  </Label>
                  <Textarea
                    id="transcript"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your meeting transcript here... 

Example format:
[John]: Welcome to our weekly meeting.
[Sarah]: Thanks for organizing this, John.
[John]: Let's start with project updates..."
                    className="min-h-[300px] font-mono text-sm"
                    required
                    disabled={isProcessing}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Minimum 50 characters required</span>
                    <span className={transcript.length > 100000 ? "text-red-500" : ""}>
                      {transcript.length > 100000 ? "Too long!" : `${transcript.length} characters`}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isProcessing}
                  >
                    Reset Form
                  </Button>

                  <div className="flex gap-2">
                    {currentSessionId && !isProcessing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/meeting-analysis/${currentSessionId}`)}
                      >
                        View Results
                      </Button>
                    )}
                    
                    <Button
                      type="submit"
                      disabled={isProcessing || !isAuthenticated}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : isPolling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          Start AI Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights Sidebar */}
        <div className="space-y-6">
          {/* RAG Enhancement Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">RAG Enhancement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                Enabled by Default
              </Badge>
              <p className="text-sm text-gray-600">
                Every analysis is enhanced with Retrieval-Augmented Generation (RAG) 
                to provide contextual insights from your previous meetings and knowledge base.
              </p>
            </CardContent>
          </Card>

          {/* AI Capabilities Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Analysis Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Topic Extraction (3-7 key themes)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Action Item Detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Sentiment Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Meeting Summaries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Decision Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Context Retrieval</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips for Best Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Include speaker names in brackets: [John]:</li>
                <li>• Capture key decisions and action items</li>
                <li>• Include participant reactions and discussions</li>
                <li>• Mention specific deadlines and assignees</li>
                <li>• Add context about project background</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
