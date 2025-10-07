import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Call, CallAnalysis } from "@/components/calls/types";
import { format } from "date-fns";
import { BodyText, SubHeading } from "@/components/ui/typography";
import { Phone, Calendar, Clock, ArrowDownLeft, ArrowUpRight, MessageSquare } from "lucide-react";
import { outcomeMapping } from "@/components/dashboard/call-outcomes/OutcomeMapping";
import { OutcomeBadge } from "@/components/ui/outcome-badge";
import { formatSummaryForDisplay } from "@/utils/summaryUtils";

interface CallInfoCardsProps {
  callData: Call;
}

export function CallInfoCards({ callData }: CallInfoCardsProps) {
  const callDate = new Date(callData.date);
  const formattedDate = format(callDate, "MMM d, yyyy");
  const formattedTime = callData.time;
  
  const resolution = callData.resolution?.toLowerCase() || "";
  const mappedOutcome = resolution ? outcomeMapping[resolution] : null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SubHeading>{callData.name}</SubHeading>
                <BodyText>{callData.phoneNumber}</BodyText>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{formattedDate}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Time</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{formattedTime}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{callData.duration}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Direction</div>
                <div className="flex items-center mt-1">
                  {callData.direction === "inbound" ? (
                    <ArrowDownLeft className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 mr-2 text-blue-500" />
                  )}
                  <span className="capitalize">{callData.direction}</span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {callData.tags && callData.tags.length > 0 ? (
                  callData.tags.map((tag) => (
                    <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'white' }}>
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SubHeading>Call Outcome</SubHeading>
                <BodyText>Result and analysis</BodyText>
              </div>
            </div>
            
            {resolution && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Resolution</div>
                {mappedOutcome ? (
                  <OutcomeBadge
                    outcome={mappedOutcome.name}
                    icon={mappedOutcome.icon}
                    color={mappedOutcome.color}
                  />
                ) : (
                  <span className="capitalize">{resolution}</span>
                )}
              </div>
            )}
            
            {callData.analysis && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Analysis</div>
                <div className="space-y-2">
                  {Object.entries(callData.analysis).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2">
                      <div className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}:</div>
                      <div>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {callData.summary && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Summary</div>
                <p className="text-sm">{formatSummaryForDisplay(callData.summary)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
