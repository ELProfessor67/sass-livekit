
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, AlertCircle } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeading, BodyText } from "@/components/ui/typography";
import { fetchCallById } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CallDetailCards } from "@/components/calls/details/CallDetailCards";
import { CallContentTabs } from "@/components/calls/details/CallContentTabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";

export default function CallDetails() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  const { data: callData, isLoading, error, isError } = useQuery({
    queryKey: ["call", id],
    queryFn: () => {
      console.log(`Starting fetch for call ID: ${id}`);
      return fetchCallById(id as string);
    },
    retry: 2, // Retry up to 2 times for this specific query
    refetchOnMount: false,
  });

  const handleDownload = () => {
    toast({
      title: "Recording downloaded",
      description: "Call recording has been downloaded successfully",
    });
  };

  const hasRecording = callData?.call_recording && typeof callData.call_recording === 'string';

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="animate-pulse text-center">
              <PageHeading className="mb-6">Loading call details...</PageHeading>
              <BodyText className="text-muted-foreground">Please wait while we fetch the call information.</BodyText>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  // Show error state
  if (isError) {
    console.error("Error loading call:", error);
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
          <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
            <ThemeSection spacing="lg">
              <div className="flex items-center justify-between border-theme-light pb-[var(--space-lg)]">
                <div className="flex items-center gap-[var(--space-lg)]">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/calls" className="flex items-center">
                      <ArrowLeft className="h-4 w-4 mr-[var(--space-md)]" />
                      Back to Calls
                    </Link>
                  </Button>
                  <PageHeading>Call Details</PageHeading>
                </div>
              </div>
              
              <ThemeCard variant="liquid">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Call</AlertTitle>
                  <AlertDescription>
                    {error instanceof Error 
                      ? error.message 
                      : "Could not load call details. Please try again later."}
                  </AlertDescription>
                </Alert>
                
                <div className="mt-[var(--space-lg)] text-center">
                  <p className="mb-[var(--space-lg)]">This could be because:</p>
                  <ul className="list-disc list-inside text-left max-w-md mx-auto">
                    <li>The call ID is invalid</li>
                    <li>The call was deleted</li>
                    <li>There was a network issue</li>
                  </ul>
                </div>
              </ThemeCard>
            </ThemeSection>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  // Show not found state
  if (!callData) {
    console.warn(`Call data is missing for ID: ${id}`);
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <PageHeading className="mb-6">Call not found</PageHeading>
              <BodyText className="text-muted-foreground mb-6">
                The call details you're looking for could not be found.
              </BodyText>
              <Button variant="outline" size="sm" asChild>
                <Link to="/calls">Back to Calls</Link>
              </Button>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  console.log("Successfully loaded call data:", callData.id);

  // Show call details
  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
          <ThemeSection spacing="lg">
            <div className="flex items-center justify-between border-theme-light pb-[var(--space-lg)]">
              <div className="flex items-center gap-[var(--space-lg)]">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/calls" className="flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-[var(--space-md)]" />
                    Back to Calls
                  </Link>
                </Button>
                <PageHeading>Call Details</PageHeading>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload} 
                disabled={!hasRecording}
              >
                <Download className="mr-[var(--space-md)] h-4 w-4" />
                Download Recording
              </Button>
            </div>
            
            <CallDetailCards callData={callData} />
            
            <CallContentTabs 
              callData={callData}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </ThemeSection>
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
}
