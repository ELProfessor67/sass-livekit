import React, { useState, useEffect } from "react";
import { Check, Phone, Plus, Loader2, AlertCircle, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber } from "@/utils/formatUtils";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import "./EnhancedImportDialog.css";

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  status: string;
  origin: string;
  isConfigured: boolean;
}

interface TwilioNumbersResponse {
  numbers: TwilioNumber[];
  accountLabel: string;
  totalCount: number;
  configuredCount: number;
  availableCount: number;
}

interface SelectedNumber extends TwilioNumber {
  label: string;
  assistant: string;
}

interface EnhancedImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistants: Array<{ id: string; name: string }>;
}

export function EnhancedImportDialog({ 
  open, 
  onOpenChange, 
  assistants 
}: EnhancedImportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioNumbersResponse | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [configuredNumbers, setConfiguredNumbers] = useState<Map<string, Partial<SelectedNumber>>>(new Map());
  const [manualNumber, setManualNumber] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [manualAssistant, setManualAssistant] = useState("");
  const [error, setError] = useState<string | null>(null);


  // Load Twilio numbers when dialog opens
  useEffect(() => {
    if (open) {
      fetchTwilioNumbers();
    } else {
      // Reset state when dialog closes
      setSelectedNumbers(new Set());
      setConfiguredNumbers(new Map());
      setManualNumber("");
      setManualLabel("");
      setError(null);
    }
  }, [open]);


  const fetchTwilioNumbers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const base = (import.meta.env.VITE_BACKEND_URL as string) ?? "http://localhost:4000";
      
      // Try user-specific endpoint first
      const url = `${base}/api/v1/twilio/user/phone-numbers`;
      const res = await fetch(url, {
        headers: {
          'x-user-id': user?.id || '',
        },
      });
      const json = await res.json();

      if (!json.success) {
        if (res.status === 404 && json.message === 'No Twilio credentials found') {
          throw new Error('No Twilio credentials found. Please configure your Twilio credentials in Settings.');
        }
        
        // If user endpoint fails, try fallback to admin endpoint
        console.log('User endpoint failed, trying admin endpoint:', json.message);
        return fetchFromAdminEndpoint();
      }

      // Filter for only numbers with demo voice URL AND no trunk assignment (unused numbers)
      const demoNumbers = (json.numbers || []).filter((n: any) => 
        n.voiceUrl === "https://demo.twilio.com/welcome/voice/" && n.trunkSid === null
      );

      // Transform the response to match our interface - show only unused demo numbers
      const transformedResponse: TwilioNumbersResponse = {
        numbers: demoNumbers.map((n: any) => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName || n.phoneNumber,
          capabilities: {
            voice: true,
            sms: true,
            mms: false
          },
          status: n.usage || 'unused',
          origin: 'twilio',
          isConfigured: n.mapped || false
        })),
        accountLabel: 'Twilio Account',
        totalCount: demoNumbers.length,
        configuredCount: demoNumbers.filter((n: any) => n.mapped).length,
        availableCount: demoNumbers.filter((n: any) => !n.mapped).length
      };

      setTwilioNumbers(transformedResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Twilio numbers';
      setError(errorMessage);
      toast({
        title: "Error loading numbers",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFromAdminEndpoint = async () => {
    try {
      const base = (import.meta.env.VITE_BACKEND_URL as string) ?? "http://localhost:4000";
      const url = `${base}/api/v1/twilio/phone-numbers`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Failed to fetch Twilio numbers");
      }

      // Filter for only numbers with demo voice URL AND no trunk assignment (unused numbers)
      const demoNumbers = (json.numbers || []).filter((n: any) => 
        n.voiceUrl === "https://demo.twilio.com/welcome/voice/" && n.trunkSid === null
      );

      // Transform the response to match our interface - show only unused demo numbers
      const transformedResponse: TwilioNumbersResponse = {
        numbers: demoNumbers.map((n: any) => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName || n.phoneNumber,
          capabilities: {
            voice: true,
            sms: true,
            mms: false
          },
          status: n.usage || 'unused',
          origin: 'twilio',
          isConfigured: n.mapped || false
        })),
        accountLabel: 'Twilio Account',
        totalCount: demoNumbers.length,
        configuredCount: demoNumbers.filter((n: any) => n.mapped).length,
        availableCount: demoNumbers.filter((n: any) => !n.mapped).length
      };

      setTwilioNumbers(transformedResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Twilio numbers';
      setError(errorMessage);
      toast({
        title: "Error loading numbers",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleNumberSelection = (number: TwilioNumber, checked: boolean) => {
    const newSelected = new Set(selectedNumbers);
    const newConfigured = new Map(configuredNumbers);
    
    if (checked) {
      newSelected.add(number.sid);
      // Set default configuration
      newConfigured.set(number.sid, {
        ...number,
        label: generateDefaultLabel(number, newSelected.size),
        assistant: assistants[0]?.name || ""
      });
    } else {
      newSelected.delete(number.sid);
      newConfigured.delete(number.sid);
    }
    
    setSelectedNumbers(newSelected);
    setConfiguredNumbers(newConfigured);
  };

  const generateDefaultLabel = (number: TwilioNumber, index: number): string => {
    if (number.friendlyName && number.friendlyName !== number.phoneNumber) {
      return number.friendlyName;
    }
    return `Phone Line ${index}`;
  };

  const updateNumberConfiguration = (sid: string, field: keyof SelectedNumber, value: string) => {
    const newConfigured = new Map(configuredNumbers);
    const existing = newConfigured.get(sid) || {};
    newConfigured.set(sid, { ...existing, [field]: value });
    setConfiguredNumbers(newConfigured);
  };

  const handleBatchConfiguration = (field: keyof SelectedNumber, value: string) => {
    const newConfigured = new Map(configuredNumbers);
    selectedNumbers.forEach(sid => {
      const existing = newConfigured.get(sid) || {};
      newConfigured.set(sid, { ...existing, [field]: value });
    });
    setConfiguredNumbers(newConfigured);
  };

  const handleImportSelected = async () => {
    if (selectedNumbers.size === 0) return;
    
    setIsLoading(true);
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    
    try {
      // Process each selected number with trunk-based assignment
      for (const sid of selectedNumbers) {
        const twilioNumber = twilioNumbers?.numbers.find(n => n.sid === sid);
        const config = configuredNumbers.get(sid);
        
        if (!twilioNumber || !config?.assistant) {
          console.warn(`Skipping ${sid}: missing number or assistant config`);
          continue;
        }
        
        // Find the assistant object
        const assistant = assistants.find(a => a.name === config.assistant);
        if (!assistant) {
          console.warn(`Assistant not found: ${config.assistant}`);
          continue;
        }
        
        console.log(`Processing ${twilioNumber.phoneNumber} → ${assistant.name}`);
        
        // Step 1: Attach phone number to user's Twilio trunk
        const attachResp = await fetch(`${base}/api/v1/twilio/user/trunk/attach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'x-user-id': user?.id || '',
          },
          body: JSON.stringify({ phoneSid: twilioNumber.sid }),
        });
        const attachJson = await attachResp.json();
        if (!attachResp.ok || !attachJson.success) {
          throw new Error(attachJson.message || "Failed to attach number to Twilio trunk");
        }
        console.log('Phone number attached to Twilio trunk');

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
              assistantId: assistant.id,
              assistantName: assistant.name,
              phoneNumber: twilioNumber.phoneNumber,
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
            phoneSid: twilioNumber.sid,
            assistantId: assistant.id,
            label: config.label || generateDefaultLabel(twilioNumber, 1),
            outboundTrunkId: livekitTrunk?.outboundTrunkId,
            outboundTrunkName: livekitTrunk?.outboundTrunkName,
          }),
        });
        const mapJson = await mapResp.json();
        if (!mapResp.ok || !mapJson.success) {
          throw new Error(mapJson.message || "Failed to map phone number to assistant");
        }
        console.log('Phone number mapped to assistant with trunk info');
      }
      
      // Success - close dialog and show success message
      toast({
        title: "Import successful",
        description: `${selectedNumbers.size} phone number(s) assigned successfully with trunk integration`,
      });
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error during trunk-based assignment:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to assign phone numbers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualImport = async () => {
    if (!manualNumber) return;
    
    setIsLoading(true);
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    
    try {
      // Find the assistant object
      const assistant = assistants.find(a => a.name === manualAssistant);
      if (!assistant) {
        throw new Error("Please select an assistant");
      }
      
      console.log(`Processing manual number ${manualNumber} → ${assistant.name}`);
      
      // For manual numbers, we'll create a temporary SID and use the trunk system
      const tempSid = `manual-${Date.now()}`;
      
      // Step 1: Create phone number entry in Twilio (if needed) and attach to trunk
      const attachResp = await fetch(`${base}/api/v1/twilio/user/trunk/attach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ 
          phoneSid: tempSid,
          phoneNumber: manualNumber,
          isManual: true 
        }),
      });
      const attachJson = await attachResp.json();
      if (!attachResp.ok || !attachJson.success) {
        throw new Error(attachJson.message || "Failed to attach manual number to Twilio trunk");
      }
      console.log('Manual phone number attached to Twilio trunk');

      // Step 2: Create dedicated LiveKit trunk for this assistant
      let livekitTrunk = null;
      try {
        const livekitResp = await fetch(`${base}/api/v1/livekit/assistant-trunk`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'x-user-id': user?.id || ''
          },
          body: JSON.stringify({
            assistantId: assistant.id,
            assistantName: assistant.name,
            phoneNumber: manualNumber,
          }),
        });
        const livekitJson = await livekitResp.json();
        if (!livekitResp.ok || !livekitJson.success) {
          console.warn('LiveKit integration failed:', livekitJson.message);
        } else {
          livekitTrunk = livekitJson.trunk;
          console.log('LiveKit trunk created:', livekitTrunk);
        }
      } catch (livekitError) {
        console.warn('LiveKit integration error:', livekitError);
      }

      // Step 3: Map phone number to assistant in database
      const mapResp = await fetch(`${base}/api/v1/twilio/map`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          phoneSid: tempSid,
          assistantId: assistant.id,
          label: manualLabel || "Manual Entry",
          phoneNumber: manualNumber,
          outboundTrunkId: livekitTrunk?.outboundTrunkId,
          outboundTrunkName: livekitTrunk?.outboundTrunkName,
          isManual: true,
        }),
      });
      const mapJson = await mapResp.json();
      if (!mapResp.ok || !mapJson.success) {
        throw new Error(mapJson.message || "Failed to map manual phone number to assistant");
      }
      console.log('Manual phone number mapped to assistant with trunk info');
      
      // Success
      toast({
        title: "Manual import successful",
        description: `${manualNumber} assigned to ${assistant.name} with trunk integration`,
      });
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error during manual trunk-based assignment:', error);
      toast({
        title: "Manual import failed",
        description: error instanceof Error ? error.message : "Failed to assign manual phone number",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent 
        className="sm:max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm"
      >
        <ThemedDialogHeader 
          title="Import Phone Numbers from Twilio"
          description="Select from all available phone numbers in your Twilio account"
        />

        <Tabs defaultValue="twilio" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="twilio" className="flex items-center gap-2 text-white">
              <Phone className="h-4 w-4" />
              Select from Twilio
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2 text-white">
              <Plus className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="twilio" className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Loading Twilio numbers...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                  <div>
                    <p className="text-foreground font-medium">Failed to load numbers</p>
                    <p className="text-muted-foreground text-sm">{error}</p>
                  </div>
                  <Button onClick={fetchTwilioNumbers} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {twilioNumbers && !isLoading && !error && (
              <>
                {/* Account Info */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <h3 
                        className="font-medium text-white"
                        style={{ 
                          color: '#ffffff !important',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}
                      >
                        {twilioNumbers.accountLabel}
                      </h3>
                      <p 
                        className="text-sm text-white/70"
                        style={{ 
                          color: 'rgba(255, 255, 255, 0.7) !important',
                          fontSize: '14px'
                        }}
                      >
                        {twilioNumbers.totalCount} total numbers • {twilioNumbers.availableCount} available for assignment 
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-white">
                      {selectedNumbers.size} selected
                    </Badge>
                  </div>
                </div>

                {/* Batch Configuration */}
                {selectedNumbers.size > 0 && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-medium text-foreground mb-3">Batch Configuration</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label className="text-foreground text-sm">Apply Assistant to All</Label>
                        <select 
                          onChange={(e) => handleBatchConfiguration('assistant', e.target.value)}
                          className="w-full h-10 px-3 py-2 bg-background border border-border text-foreground rounded-md"
                        >
                          <option value="">Select assistant</option>
                          {assistants.map((assistant) => (
                            <option key={assistant.id} value={assistant.name}>
                              {assistant.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Numbers List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {twilioNumbers.numbers.map((number) => (
                    <div 
                      key={number.sid} 
                      className={`p-4 rounded-lg border transition-all ${
                        number.isConfigured 
                          ? 'bg-muted/50 border-border opacity-75' 
                          : selectedNumbers.has(number.sid)
                            ? 'bg-primary/5 border-primary'
                            : 'bg-background border-border hover:border-border/60'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedNumbers.has(number.sid)}
                          onCheckedChange={(checked) => handleNumberSelection(number, checked as boolean)}
                          disabled={number.isConfigured}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 
                                className="font-medium text-white"
                                style={{ 
                                  color: '#ffffff !important',
                                  fontSize: '16px',
                                  fontWeight: '500'
                                }}
                              >
                                {formatPhoneNumber(number.phoneNumber)}
                              </h4>
                              <p 
                                className="text-sm text-white/70"
                                style={{ 
                                  color: 'rgba(255, 255, 255, 0.7) !important',
                                  fontSize: '14px'
                                }}
                              >
                                {number.friendlyName !== number.phoneNumber ? number.friendlyName : 'No friendly name'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {number.capabilities.voice && <Badge variant="secondary" className="text-xs text-white">Voice</Badge>}
                              {number.capabilities.sms && <Badge variant="secondary" className="text-xs text-white">SMS</Badge>}
                              {number.isConfigured && <Badge variant="outline" className="text-xs text-white">Configured</Badge>}
                            </div>
                          </div>

                          {/* Individual Configuration */}
                          {selectedNumbers.has(number.sid) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                              <div>
                                <Label className="text-white text-xs">Label</Label>
                                <Input
                                  value={configuredNumbers.get(number.sid)?.label || ""}
                                  onChange={(e) => updateNumberConfiguration(number.sid, 'label', e.target.value)}
                                  placeholder="e.g., Sales Line"
                                  className="bg-gray-800 border-gray-600 text-white text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-white text-xs">Assistant</Label>
                                <select 
                                  value={configuredNumbers.get(number.sid)?.assistant || ""} 
                                  onChange={(e) => updateNumberConfiguration(number.sid, 'assistant', e.target.value)}
                                  className="w-full h-10 px-3 py-2 bg-gray-800 border border-gray-600 text-white text-sm rounded-md"
                                >
                                  <option value="">Select Assistant</option>
                                  {assistants.map((assistant) => (
                                    <option key={assistant.id} value={assistant.name}>
                                      {assistant.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportSelected} 
                    disabled={selectedNumbers.size === 0}
                    className="min-w-32"
                  >
                    Import {selectedNumbers.size > 0 && `(${selectedNumbers.size})`}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="manual-number" className="text-white">Phone Number</Label>
                <Input
                  id="manual-number"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="manual-label" className="text-white">Label (Optional)</Label>
                <Input
                  id="manual-label"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  placeholder="e.g., Main Sales Line"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="manual-assistant" className="text-white">Assistant</Label>
                <select 
                  value={manualAssistant} 
                  onChange={(e) => setManualAssistant(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-gray-800 border border-gray-600 text-white text-sm rounded-md"
                >
                  <option value="">Select Assistant</option>
                  {assistants.map((assistant) => (
                    <option key={assistant.id} value={assistant.name}>
                      {assistant.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleManualImport} disabled={!manualNumber || !manualAssistant}>
                Import Number
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}
