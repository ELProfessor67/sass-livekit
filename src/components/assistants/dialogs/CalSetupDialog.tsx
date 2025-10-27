import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setupCalEventType } from "@/lib/api/calls/setupCalEventType";

interface CalSetupDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfigured: (config: { cal_api_key: string; cal_event_type_id: string; cal_event_type_slug: string; cal_timezone: string }) => void;
  defaultTimezone?: string;
  trigger?: React.ReactNode;
}

export const CalSetupDialog: React.FC<CalSetupDialogProps> = ({ open, onOpenChange, onConfigured, defaultTimezone = "UTC", trigger }) => {
  const [apiKey, setApiKey] = useState("");
  const [slug, setSlug] = useState("");
  // Timezone is hardcoded to UTC
  const timezone = "UTC";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === 'boolean' && typeof onOpenChange === 'function';
  const currentOpen = isControlled ? (open as boolean) : internalOpen;
  const setOpen = isControlled ? (onOpenChange as (o: boolean) => void) : setInternalOpen;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await setupCalEventType({ apiKey, eventTypeSlug: slug, timezone });
      onConfigured({ cal_api_key: apiKey, cal_event_type_id: res.eventTypeId, cal_event_type_slug: res.eventTypeSlug, cal_timezone: timezone });
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to configure calendar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={currentOpen} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Cal.com</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cal.com API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="cal_live_..." />
          </div>
          <div className="space-y-2">
            <Label>Event Type Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="team/demo-call" />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !apiKey || !slug}>{submitting ? "Connecting..." : "Connect"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


