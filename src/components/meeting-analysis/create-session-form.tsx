"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MeetingAnalysisService,
  AnalyzeTranscriptRequest,
} from "@/lib/api/meeting-analysis-service";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";

interface CreateSessionFormProps {
  onAnalysisStarted: (sessionId: string) => void;
}

export function CreateSessionForm({
  onAnalysisStarted,
}: CreateSessionFormProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Form state
  const [transcript, setTranscript] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [duration, setDuration] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    setStatus("Preparing analysis...");

    try {
      // Prepare the analysis request
      const request: AnalyzeTranscriptRequest = {
        transcript: transcript.trim(),
        metadata: {
          title: meetingTitle.trim() || "Meeting Analysis",
          participants: parseParticipants(participants),
          date: meetingDate ? new Date(meetingDate).toISOString() : new Date().toISOString(),
          duration: duration.trim() || undefined,
        }
      };

      console.log("Submitting analysis request:", {
        transcriptLength: request.transcript.length,
        metadata: request.metadata
      });

      // Submit the analysis
      setStatus("Submitting transcript for analysis...");
      const result = await MeetingAnalysisService.analyzeTranscript(request);
      
      console.log("Analysis started:", result);
      setCurrentSessionId(result.sessionId);
      setIsSubmitting(false);
      setIsPolling(true);
      setStatus("Analysis in progress...");
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
                setStatus("Analysis queued...");
                break;
              case "in_progress":
                newProgress = Math.min(40 + (attempts * 3), 90);
                setStatus("AI agents analyzing transcript...");
                break;
              case "completed":
                newProgress = 100;
                setStatus("Analysis completed!");
                setIsPolling(false);
                setSuccess("Analysis completed successfully!");
                
                // Call the callback and navigate after a short delay
                setTimeout(() => {
                  onAnalysisStarted(result.sessionId);
                }, 1000);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{status}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {currentSessionId && (
            <p className="text-xs text-gray-500">Session ID: {currentSessionId}</p>
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
              onClick={() => onAnalysisStarted(currentSessionId)}
            >
              View Results
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={isProcessing || !isAuthenticated}
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
              "Start Analysis"
            )}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Tip:</strong> For best results, include speaker names in brackets (e.g., [John]:) 
        and ensure the transcript captures the key discussion points, decisions, and action items.
        The AI will automatically extract topics, action items, sentiment, and generate a comprehensive summary.
      </div>
    </form>
  );
}
