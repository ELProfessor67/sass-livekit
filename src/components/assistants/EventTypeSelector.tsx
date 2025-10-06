import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddEventTypeDialog } from "./dialogs/AddEventTypeDialog";
import { CalendarEventTypeService, type CalendarEventType } from "@/lib/calendar-event-types";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Loader2 } from "lucide-react";

interface EventTypeSelectorProps {
  calendarCredentialId: string;
  selectedEventTypeId?: string;
  onEventTypeChange: (eventType: CalendarEventType | null) => void;
}

export function EventTypeSelector({ 
  calendarCredentialId, 
  selectedEventTypeId, 
  onEventTypeChange 
}: EventTypeSelectorProps) {
  const [eventTypes, setEventTypes] = useState<CalendarEventType[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load event types when calendar credential changes
  useEffect(() => {
    if (calendarCredentialId && calendarCredentialId !== "None") {
      loadEventTypes();
    } else {
      setEventTypes([]);
    }
  }, [calendarCredentialId]);

  const loadEventTypes = async () => {
    try {
      setLoading(true);
      const types = await CalendarEventTypeService.getEventTypesByCredential(calendarCredentialId);
      setEventTypes(types);
    } catch (error) {
      console.error("Error loading event types:", error);
      toast({
        title: "Error",
        description: "Failed to load event types.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeSelect = (eventTypeId: string) => {
    if (eventTypeId === "None") {
      onEventTypeChange(null);
      return;
    }

    const selectedEventType = eventTypes.find(type => type.id === eventTypeId);
    if (selectedEventType) {
      onEventTypeChange(selectedEventType);
    }
  };

  const handleNewEventTypeCreated = (newEventType: CalendarEventType) => {
    // Add the new event type to the list
    setEventTypes(prev => [newEventType, ...prev]);
    
    // Automatically select the new event type
    onEventTypeChange(newEventType);
    
    toast({
      title: "Event Type Added",
      description: `"${newEventType.label}" has been added and selected.`,
    });
  };

  if (!calendarCredentialId || calendarCredentialId === "None") {
    return (
      <div className="space-y-2">
        <Label className="block text-sm font-medium">Event Type</Label>
        <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
          Select a calendar integration first to choose an event type.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="block text-sm font-medium">Event Type</Label>
      
      <div className="flex gap-2">
        <Select 
          value={selectedEventTypeId || "None"} 
          onValueChange={handleEventTypeSelect}
          disabled={loading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="None">None</SelectItem>
            {eventTypes.map((eventType) => (
              <SelectItem key={eventType.id} value={eventType.id}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{eventType.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {eventType.event_type_slug} • {eventType.duration_minutes}min
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <AddEventTypeDialog 
          calendarCredentialId={calendarCredentialId}
          onSuccess={handleNewEventTypeCreated}
        >
          <Button variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </AddEventTypeDialog>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading event types...
        </div>
      )}

      {!loading && eventTypes.length === 0 && (
        <div className="p-3 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No event types found for this calendar integration.
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Click the + button to create your first event type.
          </p>
        </div>
      )}
    </div>
  );
}
