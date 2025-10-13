


import React, { useState, useEffect } from "react";
import { Phone, Plus, Pencil } from "lucide-react";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber } from "@/utils/formatUtils";
import { EnhancedImportDialog } from "../dialogs/EnhancedImportDialog";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTrigger,
} from "@/components/ui/themed-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRouteChangeData } from "@/hooks/useRouteChange";
import { fetchPhoneNumberMappings } from "@/lib/api/phoneNumbers/fetchPhoneNumberMappings";

interface PhoneNumber {
  id: string;
  number: string;
  label?: string;
  status: "active" | "inactive" | "pending";
  inboundAssistant?: string;
  outboundAssistant?: string;
}

interface PhoneNumbersTabProps {
  tabChangeTrigger?: number;
}

function PhoneNumberCard({ 
  phoneNumber, 
  assistants, 
  onAssign, 
  loading 
}: { 
  phoneNumber: PhoneNumber; 
  assistants: Array<{ id: string; name: string }>;
  onAssign: (phoneNumber: PhoneNumber, inboundAssistant: string, outboundAssistant?: string) => void;
  loading: boolean;
}) {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState(phoneNumber);
  const [inboundAssistant, setInboundAssistant] = useState(phoneNumber.inboundAssistant || "");
  const [outboundAssistant, setOutboundAssistant] = useState(phoneNumber.outboundAssistant || "none");

  const statusColors = {
    active: "hsl(142 76% 36%)",
    inactive: "hsl(215 28% 17%)",
    pending: "hsl(45 93% 47%)"
  };

  const handleSave = () => {
    if (!inboundAssistant) {
      toast({
        title: "Error",
        description: "Please select an inbound assistant.",
        variant: "destructive",
      });
      return;
    }
    
    onAssign(phoneNumber, inboundAssistant, outboundAssistant === "none" ? undefined : outboundAssistant);
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    toast({
      title: "Phone number deleted",
      description: "The phone number has been removed from your account.",
      variant: "destructive",
    });
  };

  return (
    <ThemedDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <ThemedDialogTrigger asChild>
        <ThemeCard variant="default" className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer">
          <div className="p-4">
            {/* Header Row: Phone Number + Status */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-light text-foreground">
                  {formatPhoneNumber(phoneNumber.number)}
                </h3>
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: statusColors[phoneNumber.status] }}
                />
              </div>
              
              {/* Compact Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Subtitle: Label */}
            {phoneNumber.label && (
              <p className="text-xs text-muted-foreground mb-3">
                {phoneNumber.label}
              </p>
            )}
            
            {/* Assistant Info */}
            <div className="space-y-1">
              {phoneNumber.inboundAssistant && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Inbound:</span>
                  <span className="text-xs text-foreground">{phoneNumber.inboundAssistant}</span>
                </div>
              )}
              {phoneNumber.outboundAssistant && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Outbound:</span>
                  <span className="text-xs text-foreground">{phoneNumber.outboundAssistant}</span>
                </div>
              )}
            </div>
          </div>
        </ThemeCard>
      </ThemedDialogTrigger>
      
      <ThemedDialogContent className="sm:max-w-[425px] bg-gray-900/95 backdrop-blur-sm">
        <ThemedDialogHeader
          title="Configure Phone Number"
          description={`Assign assistants and manage settings for ${formatPhoneNumber(phoneNumber.number)}`}
        />
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-light text-foreground">Phone Number Details</h4>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Number</span>
                  <span className="font-light text-foreground">
                    {formatPhoneNumber(phoneNumber.number)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={phoneNumber.status === 'active' ? 'default' : 'secondary'}>
                    {phoneNumber.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="label" className="text-foreground font-light">Label (Optional)</Label>
            <Input
              id="label"
              value={editingNumber.label || ""}
              onChange={(e) => setEditingNumber({...editingNumber, label: e.target.value})}
              placeholder="e.g., Main Sales Line"
              className="bg-background border-border text-foreground"
            />
          </div>
          <div>
            <Label htmlFor="inbound" className="text-foreground font-light">Inbound Assistant</Label>
            <Select 
              value={inboundAssistant} 
              onValueChange={setInboundAssistant}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select assistant" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.name} className="text-foreground hover:bg-muted">
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="outbound" className="text-foreground font-light">Outbound Assistant</Label>
            <Select 
              value={outboundAssistant} 
              onValueChange={setOutboundAssistant}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select assistant (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="none">None</SelectItem>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.name} className="text-foreground hover:bg-muted">
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Assigning..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}

export function PhoneNumbersTab({ tabChangeTrigger = 0 }: PhoneNumbersTabProps) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [assistants, setAssistants] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [hasTwilioCredentials, setHasTwilioCredentials] = useState<boolean | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const base = (import.meta.env.VITE_BACKEND_URL as string) ?? "http://localhost:4000";

  // Load assistants for current user
  useEffect(() => {
    if (user?.id) {
      (async () => {
        const { data } = await supabase
          .from("assistant")
          .select("id, name")
          .eq("user_id", user.id);
        setAssistants((data || []).map((a: any) => ({ id: a.id, name: a.name ?? "Untitled" })));
      })();
    }
  }, [user?.id]);

  // Load phone numbers from Twilio after assistants are loaded
  useEffect(() => {
    if (user?.id && assistants.length > 0) {
      loadAllNumbersFromTwilio();
    }
  }, [user?.id, assistants.length]);

  // Trigger API call when tab changes
  useEffect(() => {
    if (tabChangeTrigger > 0 && user?.id && assistants.length > 0) {
      loadAllNumbersFromTwilio();
    }
  }, [tabChangeTrigger, user?.id, assistants.length]);

  // Trigger API call on route changes
  useRouteChangeData(loadAllNumbersFromTwilio, [user?.id, assistants.length], {
    enabled: !!user?.id && assistants.length > 0,
    refetchOnRouteChange: true
  });

  async function loadAllNumbersFromTwilio() {
    try {
      setLoading(true);

      // First try user-specific endpoint
      const url = `${base}/api/v1/twilio/user/phone-numbers`;
      const res = await fetch(url, {
        headers: {
          'x-user-id': user?.id || '',
        },
      });
      const json = await res.json();

      if (!json.success) {
        if (res.status === 404 && json.message === 'No Twilio credentials found') {
          setHasTwilioCredentials(false);
          setPhoneNumbers([]);
          return;
        }

        // If user endpoint fails, try fallback to admin endpoint
        console.log('User endpoint failed, trying admin endpoint:', json.message);
        return loadFromAdminEndpoint();
      }

      setHasTwilioCredentials(true);
      
      // Fetch phone number mappings from database
      const mappingsResponse = await fetchPhoneNumberMappings();
      const mappings = mappingsResponse.mappings;
      
      console.log('Phone number mappings from database:', mappings);
      console.log('Twilio numbers:', json.numbers);
      
      // Create a map of phone numbers to assistant IDs
      const phoneToAssistantMap = new Map();
      mappings.forEach(mapping => {
        // Normalize phone number format for matching
        const normalizedNumber = mapping.number.replace(/\D/g, '');
        phoneToAssistantMap.set(normalizedNumber, mapping.inbound_assistant_id);
        console.log('Mapping:', mapping.number, '->', normalizedNumber, '->', mapping.inbound_assistant_id);
      });

      const mapped: PhoneNumber[] =
        ((json.numbers as any[] | undefined) || []).map((n) => {
          // Normalize Twilio phone number for matching
          const normalizedTwilioNumber = n.phoneNumber.replace(/\D/g, '');
          const assistantId = phoneToAssistantMap.get(normalizedTwilioNumber);
          const assistant = assistantId ? assistants.find(a => a.id === assistantId) : null;
          
          console.log('Twilio number:', n.phoneNumber, '->', normalizedTwilioNumber, '->', assistantId, '->', assistant?.name);
          
          return {
            id: n.sid,
            number: n.phoneNumber,
            label: n.friendlyName || undefined,
            status: getStatusFromTwilioData(n),
            inboundAssistant: assistant?.name || undefined,
            outboundAssistant: undefined, // For now, only inbound is supported
          };
        });

      setPhoneNumbers(mapped);
      const assignedCount = mapped.filter(n => n.inboundAssistant || n.outboundAssistant).length;
      const unassignedCount = mapped.length - assignedCount;
      toast({
        title: "Loaded",
        description: `Found ${mapped.length} total numbers (${assignedCount} assigned, ${unassignedCount} unassigned).`
      });
    } catch (e: any) {
      console.error("Error loading phone numbers:", e);
      // Try fallback to admin endpoint
      return loadFromAdminEndpoint();
    } finally {
      setLoading(false);
    }
  }

  async function loadFromAdminEndpoint() {
    try {
      console.log('Loading from admin endpoint as fallback');
      const url = `${base}/api/v1/twilio/phone-numbers`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Failed to fetch Twilio numbers");
      }

      setHasTwilioCredentials(true); // Assume credentials exist if admin endpoint works
      
      // Fetch phone number mappings from database
      const mappingsResponse = await fetchPhoneNumberMappings();
      const mappings = mappingsResponse.mappings;
      
      console.log('Phone number mappings from database (admin):', mappings);
      console.log('Twilio numbers (admin):', json.numbers);
      
      // Create a map of phone numbers to assistant IDs
      const phoneToAssistantMap = new Map();
      mappings.forEach(mapping => {
        // Normalize phone number format for matching
        const normalizedNumber = mapping.number.replace(/\D/g, '');
        phoneToAssistantMap.set(normalizedNumber, mapping.inbound_assistant_id);
        console.log('Mapping (admin):', mapping.number, '->', normalizedNumber, '->', mapping.inbound_assistant_id);
      });

      const mapped: PhoneNumber[] =
        ((json.numbers as any[] | undefined) || []).map((n) => {
          // Normalize Twilio phone number for matching
          const normalizedTwilioNumber = n.phoneNumber.replace(/\D/g, '');
          const assistantId = phoneToAssistantMap.get(normalizedTwilioNumber);
          const assistant = assistantId ? assistants.find(a => a.id === assistantId) : null;
          
          console.log('Twilio number (admin):', n.phoneNumber, '->', normalizedTwilioNumber, '->', assistantId, '->', assistant?.name);
          
          return {
            id: n.sid,
            number: n.phoneNumber,
            label: n.friendlyName || undefined,
            status: getStatusFromTwilioData(n),
            inboundAssistant: assistant?.name || undefined,
            outboundAssistant: undefined, // For now, only inbound is supported
          };
        });

      setPhoneNumbers(mapped);
      const assignedCount = mapped.filter(n => n.inboundAssistant || n.outboundAssistant).length;
      const unassignedCount = mapped.length - assignedCount;
      toast({
        title: "Loaded (Admin)",
        description: `Found ${mapped.length} total numbers (${assignedCount} assigned, ${unassignedCount} unassigned).`
      });
    } catch (e: any) {
      console.error("Error loading from admin endpoint:", e);
      setHasTwilioCredentials(false);
      setPhoneNumbers([]);
      toast({ title: "Error", description: e?.message || "Could not load numbers", variant: "destructive" });
    }
  }

  function getStatusFromTwilioData(n: any): "active" | "inactive" | "pending" {
    const hasTrunk = n.trunkSid && n.trunkSid !== null;
    const isDemoUrl = n.voiceUrl?.includes('demo.twilio.com');
    const isDemoUsage = n.usage === "demo";
    const isUnused = !hasTrunk && ((n.usage === "unused" && !n.mapped) || (isDemoUrl && isDemoUsage));
    
    if (hasTrunk) return "active";
    if (isDemoUrl || isDemoUsage) return "pending";
    if (isUnused) return "inactive";
    return "active";
  }

  async function handleAssign(phoneNumber: PhoneNumber, inboundAssistantName: string, outboundAssistantName?: string) {
    const inboundAssistant = assistants.find((a) => a.name === inboundAssistantName);
    const outboundAssistant = outboundAssistantName ? assistants.find((a) => a.name === outboundAssistantName) : null;
    
    if (!inboundAssistant) {
      toast({ title: "Error", description: "Inbound assistant not found.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      // Step 1: attach PN to the user's Twilio trunk
      const attachResp = await fetch(`${base}/api/v1/twilio/user/trunk/attach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ phoneSid: phoneNumber.id }),
      });
      const attachJson = await attachResp.json();
      if (!attachResp.ok || !attachJson.success) {
        throw new Error(attachJson.message || "Failed to attach number to Twilio trunk");
      }

      // Step 2: Create dedicated LiveKit trunk for this assistant (both inbound and outbound)
      let livekitTrunk = null;
      try {
        const livekitResp = await fetch(`${base}/api/v1/livekit/assistant-trunk`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'x-user-id': user?.id || ''
          },
          body: JSON.stringify({
            assistantId: inboundAssistant.id,
            assistantName: inboundAssistant.name,
            phoneNumber: phoneNumber.number,
          }),
        });
        const livekitJson = await livekitResp.json();
        if (!livekitResp.ok || !livekitJson.success) {
          console.warn('LiveKit integration failed:', livekitJson.message);
          // Don't fail the entire operation if LiveKit fails
        } else {
          livekitTrunk = livekitJson.trunk;
          console.log('LiveKit trunk created:', livekitTrunk);
        }
      } catch (livekitError) {
        console.warn('LiveKit integration error:', livekitError);
        // Don't fail the entire operation if LiveKit fails
      }

      // Step 3: Map phone number to assistant in database (including outbound trunk info)
      const mapResp = await fetch(`${base}/api/v1/twilio/map`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          phoneSid: phoneNumber.id,
          assistantId: inboundAssistant.id,
          label: phoneNumber.label || undefined,
          outboundTrunkId: livekitTrunk?.outboundTrunkId,
          outboundTrunkName: livekitTrunk?.outboundTrunkName,
        }),
      });
      const mapJson = await mapResp.json();
      if (!mapResp.ok || !mapJson.success) {
        throw new Error(mapJson.message || "Failed to map phone number to assistant");
      }

      // Update the local state with the new assignments
      setPhoneNumbers((prev) => prev.map((n) => 
        n.id === phoneNumber.id 
          ? { 
              ...n, 
              inboundAssistant: inboundAssistant.name,
              outboundAssistant: outboundAssistant?.name,
              status: "active" as const
            }
          : n
      ));

      toast({
        title: "Assigned",
        description: `${phoneNumber.number} → ${inboundAssistant.name}${outboundAssistant ? ` (Outbound: ${outboundAssistant.name})` : ''}. Phone number attached to trunk, mapped to assistant, and LiveKit dispatch rule created.`,
      });
    } catch (e: any) {
      toast({ title: "Failed to assign", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const handleImport = (numbers: Array<{
    sid: string;
    phoneNumber: string;
    label: string;
    inboundAssistant: string;
    outboundAssistant: string;
  }>) => {
    console.log("PhoneNumbersTab handleImport called with:", numbers);
    
    const newPhoneNumbers: PhoneNumber[] = numbers.map(number => ({
      id: number.sid,
      number: number.phoneNumber,
      label: number.label,
      status: "pending" as const,
      inboundAssistant: number.inboundAssistant,
      outboundAssistant: number.outboundAssistant || undefined
    }));
    
    setPhoneNumbers([...phoneNumbers, ...newPhoneNumbers]);
    
    const message = newPhoneNumbers.length === 1 
      ? "Phone number has been imported successfully"
      : `${newPhoneNumbers.length} phone numbers have been imported successfully`;
    
    toast({
      title: "Import successful",
      description: message,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-foreground mb-2">
            Phone Numbers
          </h2>
          <p className="text-muted-foreground">
            View and manage phone numbers assigned to your assistants
            {phoneNumbers.filter(n => n.inboundAssistant || n.outboundAssistant).length > 0 && (
              <span className="ml-2 text-sm">
                ({phoneNumbers.filter(n => n.inboundAssistant || n.outboundAssistant).length} assigned)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadAllNumbersFromTwilio}
            disabled={loading || hasTwilioCredentials === false}
            title={hasTwilioCredentials === false ? "Configure Twilio credentials in Settings first" : ""}
            variant="outline"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Loading
              </span>
            ) : (
              "Load from Twilio"
            )}
          </Button>
          <Button 
            variant="default"
            onClick={(e) => {
              console.log("Import Numbers button clicked", e);
              e.preventDefault();
              setIsImportOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Import Numbers
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      {isImportOpen && (
        <EnhancedImportDialog
          open={isImportOpen}
          onOpenChange={(open) => {
            console.log("EnhancedImportDialog onOpenChange:", open);
            setIsImportOpen(open);
          }}
          assistants={assistants}
        />
      )}

      {/* Phone Numbers Grid - Only show numbers assigned to assistants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          // Only show numbers that have been assigned to assistants (either inbound or outbound)
          const assignedNumbers = phoneNumbers.filter(n => 
            n.inboundAssistant || n.outboundAssistant
          );
          
          return assignedNumbers.length > 0 ? (
            assignedNumbers.map((phoneNumber) => (
              <PhoneNumberCard 
                key={phoneNumber.id} 
                phoneNumber={phoneNumber} 
                assistants={assistants}
                onAssign={handleAssign}
                loading={loading}
              />
            ))
          ) : (
            <div className="col-span-full">
              <ThemeCard variant="default" className="text-center py-12">
                <div className="p-6">
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {loading ? "Loading numbers..." : hasTwilioCredentials === false ? "No Twilio credentials configured" : "No assigned phone numbers"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {loading ? "Please wait while we load your phone numbers..." : 
                     hasTwilioCredentials === false ? "Please configure your Twilio credentials in Settings → Workspace → Integrations to manage phone numbers." :
                     "You don't have any phone numbers assigned to assistants yet. Import and assign numbers to get started."}
                  </p>
                  {!loading && hasTwilioCredentials !== false && (
                    <div className="flex gap-3 justify-center">
                      <Button 
                        variant="default"
                        onClick={loadAllNumbersFromTwilio}
                      >
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Load from Twilio
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setIsImportOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Import Numbers
                      </Button>
                    </div>
                  )}
                </div>
              </ThemeCard>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
