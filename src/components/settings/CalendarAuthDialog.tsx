import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarCredentialsService,
  type CalendarCredentialsInput,
} from "@/lib/calendar-credentials";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2 } from "lucide-react";

interface CalendarAuthDialogProps {
  children: React.ReactNode;
  onSuccess?: (credentials: CalendarCredentialsInput) => void;
}

export function CalendarAuthDialog({ children, onSuccess }: CalendarAuthDialogProps) {
  const { toast } = useToast();

  // ---- minimal state ----
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CalendarCredentialsInput>({
    provider: "calcom",
    apiKey: "",
    eventTypeId: "",
    eventTypeSlug: "", // Keep for compatibility but won't be used
    timezone: "UTC",
    label: "",
  });

  // providers list is stable; compute once when dialog opens
  const providers = useMemo(
    () => CalendarCredentialsService.getAvailableProviders(),
    []
  );

  // ---- helpers ----
  const resetForm = () => {
    setForm({
      provider: "calcom",
      apiKey: "",
      eventTypeId: "",
      eventTypeSlug: "", // Keep for compatibility but won't be used
      timezone: "UTC",
      label: "",
    });
  };

  const setField = (key: keyof CalendarCredentialsInput, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.label.trim()) return "Label is required";
    if (!form.apiKey.trim()) return "API key is required";
    return null;
  };

  // Event type ID generation removed - will be handled during assistant creation

  // ---- actions ----
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Missing info", description: err, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Save credentials to database (no event type ID needed)
      // Timezone is hardcoded to UTC
      const payload: CalendarCredentialsInput = { 
        ...form,
        timezone: "UTC", // Hardcoded to UTC
        eventTypeId: "", // Will be generated during assistant creation
        eventTypeSlug: "" // Will be provided during assistant creation
      };
      await CalendarCredentialsService.saveCredentials(payload);
      
      toast({ title: "Calendar connected", description: "Your calendar has been connected successfully." });
      onSuccess?.(payload);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error ? error.message : "Failed to connect calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Connect Calendar
          </DialogTitle>
        </DialogHeader>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-1">
          <form id="calendar-form" onSubmit={onSubmit} className="space-y-4">
              {/* Provider */}
              <div className="space-y-2">
                <Label htmlFor="provider">Calendar Provider</Label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => setField("provider", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select calendar provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Label */}
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="e.g., My Cal.com Account"
                  value={form.label}
                  onChange={(e) => setField("label", e.target.value)}
                />
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={form.provider === "calcom" ? "cal_live_..." : "Enter API key"}
                  value={form.apiKey}
                  onChange={(e) => setField("apiKey", e.target.value)}
                />
              </div>

              {/* Cal.com extras - REMOVED */}
              {/* Event type slug will be handled during assistant creation */}
            </form>
        </div>

        {/* footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" form="calendar-form" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Calendar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}