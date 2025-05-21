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
import { CreateSessionForm } from "@/components/meeting-analysis/create-session-form";
import { useAuth } from "@/context/AuthContext";

export default function MeetingAnalysisPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to be loaded before making decisions
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading]);

  // Handle new analysis creation
  const handleAnalysisStarted = async (sessionId: string) => {
    if (sessionId) {
      // Navigate to the analysis results page with the new sessionId
      router.push(`/meeting-analysis/${sessionId}`);
    }
  };

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
              Please log in to use the meeting analysis features
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="mb-4 text-center">
              You need to be logged in to analyze meeting transcripts
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
      <h1 className="mb-6 text-3xl font-bold">Meeting Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create New Analysis</CardTitle>
          <CardDescription>
            Start a new meeting analysis by uploading a transcript
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSessionForm onAnalysisStarted={handleAnalysisStarted} />
        </CardContent>
      </Card>
    </div>
  );
}
