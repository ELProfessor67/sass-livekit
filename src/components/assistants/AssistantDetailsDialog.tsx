import React, { useEffect, useState } from "react";
import { X, Phone, Calendar, MessageSquare, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Assistant {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  first_message?: string;
  first_sms?: string;
  sms_prompt?: string;
  status: "draft" | "active" | "inactive";
  interactionCount: number;
  userCount: number;
  cal_api_key?: string;
  cal_event_type_slug?: string;
  cal_event_type_id?: string;
  cal_timezone?: string;
  cal_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PhoneNumber {
  id: string;
  phone_sid: string;
  number: string;
  label?: string;
  status: string;
  webhook_status: string;
  created_at: string;
}

interface AssistantDetailsDialogProps {
  assistant: Assistant | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssistantDetailsDialog({ assistant, isOpen, onClose }: AssistantDetailsDialogProps) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (assistant && isOpen) {
      loadPhoneNumbers();
    }
  }, [assistant, isOpen]);

  const loadPhoneNumbers = async () => {
    if (!assistant?.id || !user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("phone_number")
        .select("*")
        .eq("inbound_assistant_id", assistant.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading phone numbers:", error);
        return;
      }

      setPhoneNumbers(data || []);
    } catch (error) {
      console.error("Error loading phone numbers:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Format phone number for display
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (!assistant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold">
              {assistant.name}
            </DialogTitle>

          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assistant Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Assistant Overview</CardTitle>
                <Badge className={getStatusColor(assistant.status)}>
                  {assistant.status.charAt(0).toUpperCase() + assistant.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{assistant.description || "No description provided"}</p>
              </div>

              {assistant.prompt && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">System Prompt</h4>
                  <p className="text-sm bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                    {assistant.prompt}
                  </p>
                </div>
              )}

              {assistant.first_message && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">First Message</h4>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {assistant.first_message}
                  </p>
                </div>
              )}

              {assistant.first_sms && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">First SMS Message</h4>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {assistant.first_sms}
                  </p>
                </div>
              )}

              {assistant.sms_prompt && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">SMS System Prompt</h4>
                  <p className="text-sm bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                    {assistant.sms_prompt}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{assistant.interactionCount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Interactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{assistant.userCount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration */}
          {assistant.cal_enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendar Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Event Type</h4>
                    <p className="text-sm">{assistant.cal_event_type_slug || "Not configured"}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Timezone</h4>
                    <p className="text-sm">{assistant.cal_timezone || "UTC"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Phone Numbers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Assigned Phone Numbers
                {phoneNumbers.length > 0 && (
                  <Badge variant="secondary">{phoneNumbers.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading phone numbers...</div>
                </div>
              ) : phoneNumbers.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Phone Numbers Assigned</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This assistant doesn't have any phone numbers assigned yet.
                  </p>
                  <Button variant="outline" size="sm">
                    Assign Phone Number
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {phoneNumbers.map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{formatPhoneNumber(phone.number)}</div>
                          {phone.label && (
                            <div className="text-sm text-muted-foreground">{phone.label}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={phone.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {phone.status}
                        </Badge>
                        <Badge
                          variant={phone.webhook_status === "configured" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {phone.webhook_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Created</h4>
                  <p>{assistant.created_at ? new Date(assistant.created_at).toLocaleDateString() : "Unknown"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Last Updated</h4>
                  <p>{assistant.updated_at ? new Date(assistant.updated_at).toLocaleDateString() : "Unknown"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
