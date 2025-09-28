import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, MessageSquare, Clock, Shield } from "lucide-react";
import { SMSData } from "./types";
import { WizardSlider } from "./WizardSlider";

interface SMSTabProps {
  data: SMSData;
  onChange: (data: Partial<SMSData>) => void;
}

export const SMSTab: React.FC<SMSTabProps> = ({ data, onChange }) => {
  const [isComplianceOpen, setIsComplianceOpen] = React.useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[540px]">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="flex-1 space-y-6">
          {/* Header Section */}
          <div className="mb-6">
            <h2 className="text-[28px] font-light tracking-[0.2px] mb-2">Messages</h2>
            <p className="text-base text-muted-foreground max-w-xl">
              Configure your messaging assistant for SMS, WhatsApp, and other platforms
            </p>
          </div>

          {/* Messaging Instructions Section */}
          <div className="flex-1">
            <label className="block text-base font-medium tracking-[0.2px] mb-2">
              Messaging Instructions
            </label>
            <Textarea
              placeholder="You are a messaging assistant for a dental clinic. Keep responses concise and helpful. Always ask for confirmation before booking appointments via text..."
              value={data.systemPrompt}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              className="min-h-[520px] h-full text-[15px] leading-relaxed resize-y"
              rows={20}
            />
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="lg:col-span-4">
        <div className="bg-background/50 rounded-lg p-5 h-full">
          <h3 className="text-lg font-medium tracking-tight mb-4">Messaging Settings</h3>
          
          <div className="space-y-4">
            {/* Provider */}
            <div>
              <Label className="block text-sm font-medium mb-2">Messaging Provider</Label>
              <Select value={data.provider} onValueChange={(value) => onChange({ provider: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="Twilio">Twilio</SelectItem>
                  <SelectItem value="Telnyx">Telnyx</SelectItem>
                  <SelectItem value="WhatsApp Business">WhatsApp Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Knowledge Base */}
            <div>
              <Label className="block text-sm font-medium mb-2">Knowledge Base</Label>
              <Select value={data.knowledgeBase} onValueChange={(value) => onChange({ knowledgeBase: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="General Knowledge">General Knowledge</SelectItem>
                  <SelectItem value="Product Information">Product Information</SelectItem>
                  <SelectItem value="FAQ Database">FAQ Database</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calendar */}
            <div>
              <Label className="block text-sm font-medium mb-2">Calendar</Label>
              <Select value={data.calendar} onValueChange={(value) => onChange({ calendar: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Google Calendar">Google Calendar</SelectItem>
                  <SelectItem value="Outlook">Outlook</SelectItem>
                  <SelectItem value="Calendly">Calendly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Character Limit */}
            <div>
              <Label className="block text-sm font-medium mb-2">Character Limit</Label>
              <Input
                type="number"
                value={data.characterLimit}
                onChange={(e) => onChange({ characterLimit: parseInt(e.target.value) || 160 })}
                className="h-10 text-center"
                placeholder="160"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Messages longer than this will be split
              </p>
            </div>

            {/* Response Style */}
            <div>
              <WizardSlider
                value={data.responseStyle}
                onChange={(value) => onChange({ responseStyle: value })}
                min={0}
                max={2}
                step={0.1}
                leftLabel="Formal"
                rightLabel="Casual"
              />
            </div>

            {/* Language */}
            <div>
              <Label className="block text-sm font-medium mb-2">Language</Label>
              <Select value={data.language} onValueChange={(value) => onChange({ language: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="en-es">English & Spanish</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="no">Norwegian</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Expandable Section */}
      <div className="lg:col-span-12 mt-6">
        <Collapsible open={isComplianceOpen} onOpenChange={setIsComplianceOpen}>
          <CollapsibleTrigger className="w-full p-4 border rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5">
                {isComplianceOpen ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-base font-medium">Compliance & Advanced Settings</h3>
            </div>
            <div className="w-4 h-4">
              {isComplianceOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compliance Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Compliance</h4>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">TCPA Compliant</Label>
                  <Switch
                    checked={data.complianceSettings.tcpaCompliant}
                    onCheckedChange={(checked) => onChange({
                      complianceSettings: { ...data.complianceSettings, tcpaCompliant: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Opt-in Required</Label>
                  <Switch
                    checked={data.complianceSettings.optInEnabled}
                    onCheckedChange={(checked) => onChange({
                      complianceSettings: { ...data.complianceSettings, optInEnabled: checked }
                    })}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium mb-2">Opt-out Keywords</Label>
                  <Input
                    placeholder="STOP, UNSUBSCRIBE, QUIT"
                    value={data.complianceSettings.optOutKeywords.join(', ')}
                    onChange={(e) => onChange({
                      complianceSettings: { 
                        ...data.complianceSettings, 
                        optOutKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    className="h-10"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium mb-2">Help Keywords</Label>
                  <Input
                    placeholder="HELP, INFO, SUPPORT"
                    value={data.complianceSettings.helpKeywords.join(', ')}
                    onChange={(e) => onChange({
                      complianceSettings: { 
                        ...data.complianceSettings, 
                        helpKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Escalation Rules */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Escalation</h4>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enable Escalation</Label>
                  <Switch
                    checked={data.escalationRules.enabled}
                    onCheckedChange={(checked) => onChange({
                      escalationRules: { ...data.escalationRules, enabled: checked }
                    })}
                  />
                </div>

                {data.escalationRules.enabled && (
                  <>
                    <div>
                      <Label className="block text-sm font-medium mb-2">Transfer Keywords</Label>
                      <Input
                        placeholder="AGENT, HUMAN, REPRESENTATIVE"
                        value={data.escalationRules.humanTransferKeywords.join(', ')}
                        onChange={(e) => onChange({
                          escalationRules: { 
                            ...data.escalationRules, 
                            humanTransferKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          }
                        })}
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Max Auto Responses</Label>
                      <Input
                        type="number"
                        value={data.escalationRules.maxAutoResponses}
                        onChange={(e) => onChange({
                          escalationRules: { 
                            ...data.escalationRules, 
                            maxAutoResponses: parseInt(e.target.value) || 5
                          }
                        })}
                        className="h-10 text-center"
                        placeholder="5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Transfer to human after this many responses
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

