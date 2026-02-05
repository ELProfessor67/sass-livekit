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
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTrigger,
} from "@/components/ui/themed-dialog";
import {
  CalendarCredentialsService,
  type CalendarCredentialsInput,
  type UserCalendarCredentials,
} from "@/lib/calendar-credentials";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, Plus, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";

interface CalendarAuthDialogProps {
  children: React.ReactNode;
  onSuccess?: (credentials: CalendarCredentialsInput) => void;
  integrations: UserCalendarCredentials[];
  onRemove: (id: string) => void;
  onRefresh: (id: string) => void;
}

export function CalendarAuthDialog({
  children,
  onSuccess,
  integrations,
  onRemove,
  onRefresh
}: CalendarAuthDialogProps) {
  const { toast } = useToast();

  // ---- minimal state ----
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(false);
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
      // Event type ID and slug will be handled during assistant creation
      const payload: CalendarCredentialsInput = {
        ...form,
        timezone: "UTC",
        eventTypeId: "",
        eventTypeSlug: ""
      };

      if (onSuccess) {
        await onSuccess(payload);
      }

      setShowForm(false);
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

  const maskApiKey = (apiKey: string): string => {
    if (apiKey.length <= 8) return apiKey;
    return apiKey.substring(0, 4) + "*".repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  };

  const getProviderInfo = (provider: string) => {
    return providers.find(p => p.id === provider) || { name: provider, description: '' };
  };

  return (
    <ThemedDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <ThemedDialogTrigger asChild>{children}</ThemedDialogTrigger>
      <ThemedDialogContent className="sm:max-w-md">
        <ThemedDialogHeader
          title={showForm ? "Connect Calendar" : "Calendar Integrations"}
          description={showForm ? "Enter your calendar credentials to enable scheduling features." : "Manage your connected calendar accounts."}
        />

        <div className="mt-4">
          {!showForm ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-white/60">Connected Accounts</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(true)}
                  className="h-8 gap-1.5 border-white/10 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New
                </Button>
              </div>

              {integrations.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-white/20" />
                  <p className="text-sm text-white/40">No calendars connected yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => {
                    const providerInfo = getProviderInfo(integration.provider);
                    return (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{integration.label}</p>
                              {integration.is_active && (
                                <CheckCircle2 className="h-3 w-3 text-success" />
                              )}
                            </div>
                            <p className="text-xs text-white/40 font-mono">
                              {providerInfo.name} • {maskApiKey(integration.api_key)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemove(integration.id)}
                          className="h-8 w-8 p-0 text-white/40 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form id="calendar-form" onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-4">
                {/* Provider */}
                <div className="space-y-2">
                  <Label htmlFor="provider" className="text-white/60">Calendar Provider</Label>
                  <Select
                    value={form.provider}
                    onValueChange={(v) => setField("provider", v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                  <Label htmlFor="label" className="text-white/60">Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g., My Cal.com Account"
                    value={form.label}
                    onChange={(e) => setField("label", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-white/60">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={form.provider === "calcom" ? "cal_live_..." : "Enter API key"}
                    value={form.apiKey}
                    onChange={(e) => setField("apiKey", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  className="text-white/60 hover:text-white hover:bg-white/5"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect Calendar
                </Button>
              </div>
            </form>
          )}
        </div>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}