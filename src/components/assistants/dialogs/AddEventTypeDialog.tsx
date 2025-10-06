import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarEventTypeService, type CalendarEventTypeInput } from "@/lib/calendar-event-types";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Calendar } from "lucide-react";

interface AddEventTypeDialogProps {
  children: React.ReactNode;
  calendarCredentialId: string;
  onSuccess?: (eventType: any) => void;
}

export function AddEventTypeDialog({ children, calendarCredentialId, onSuccess }: AddEventTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    eventTypeSlug: '',
    label: '',
    description: '',
    durationMinutes: 30
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.eventTypeSlug.trim()) {
        throw new Error("Event Type Slug is required");
      }
      if (!formData.label.trim()) {
        throw new Error("Label is required");
      }

      // Validate slug format (should be like "team/demo-call")
      const slugPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-_\/]*[a-zA-Z0-9]$/;
      if (!slugPattern.test(formData.eventTypeSlug)) {
        throw new Error("Event Type Slug should contain only letters, numbers, hyphens, underscores, and forward slashes");
      }

      const eventTypeInput: CalendarEventTypeInput = {
        calendarCredentialId,
        eventTypeSlug: formData.eventTypeSlug.trim(),
        label: formData.label.trim(),
        description: formData.description.trim() || undefined,
        durationMinutes: formData.durationMinutes
      };

      const newEventType = await CalendarEventTypeService.createEventType(eventTypeInput);
      
      toast({
        title: "Event Type Created",
        description: `"${newEventType.label}" has been created successfully.`,
      });

      onSuccess?.(newEventType);
      setOpen(false);
      
      // Reset form
      setFormData({
        eventTypeSlug: '',
        label: '',
        description: '',
        durationMinutes: 30
      });
    } catch (error) {
      console.error("Error creating event type:", error);
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Failed to create event type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add Event Type
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type Slug */}
          <div className="space-y-2">
            <Label htmlFor="eventTypeSlug">Event Type Slug</Label>
            <Input
              id="eventTypeSlug"
              placeholder="e.g., team/demo-call, sales/consultation"
              value={formData.eventTypeSlug}
              onChange={(e) => handleInputChange('eventTypeSlug', e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, hyphens, underscores, and forward slashes
            </p>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              placeholder="e.g., Demo Call, Sales Consultation"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this event type..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min="5"
              max="480"
              step="5"
              value={formData.durationMinutes}
              onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value) || 30)}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event Type
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
