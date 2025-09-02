import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { AdvancedData } from "./types";
import { WizardSlider } from "./WizardSlider";
import { setupCalEventType } from "@/lib/api/calls/setupCalEventType";

interface AdvancedTabProps {
  data: AdvancedData;
  onChange: (data: Partial<AdvancedData>) => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({ data, onChange }) => {
  const [calSubmitting, setCalSubmitting] = React.useState(false);
  const [calError, setCalError] = React.useState<string | null>(null);
  const [calSuccess, setCalSuccess] = React.useState<string | null>(null);

  const addEndCallPhrase = () => {
    onChange({
      endCallPhrases: [...data.endCallPhrases, ""]
    });
  };

  const updateEndCallPhrase = (index: number, value: string) => {
    const updated = [...data.endCallPhrases];
    updated[index] = value;
    onChange({ endCallPhrases: updated });
  };

  const removeEndCallPhrase = (index: number) => {
    const updated = data.endCallPhrases.filter((_, i) => i !== index);
    onChange({ endCallPhrases: updated });
  };

  const addIdleMessage = () => {
    onChange({
      idleMessages: [...data.idleMessages, ""]
    });
  };

  const updateIdleMessage = (index: number, value: string) => {
    const updated = [...data.idleMessages];
    updated[index] = value;
    onChange({ idleMessages: updated });
  };

  const removeIdleMessage = (index: number) => {
    const updated = data.idleMessages.filter((_, i) => i !== index);
    onChange({ idleMessages: updated });
  };

  return (
    <div className="max-w-4xl space-y-[var(--space-2xl)]">
      {/* Calendar Integration (Optional) */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">Calendar Integration (Optional)</h3>
          <p className="settings-card-description">
            Provide Cal.com credentials to enable in-call scheduling. Leave blank to disable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-xl)]">
          <div className="space-y-[var(--space-md)]">
            <Label className="settings-label">Cal.com API Key</Label>
            <Input
              type="password"
              placeholder="cal_live_..."
              value={data.calApiKey || ""}
              onChange={(e) => onChange({ calApiKey: e.target.value })}
              className="settings-input"
            />
          </div>
          <div className="space-y-[var(--space-md)]">
            <Label className="settings-label">Event Type Slug</Label>
            <Input
              placeholder="e.g. team/demo-call"
              value={data.calEventTypeSlug || ""}
              onChange={(e) => onChange({ calEventTypeSlug: e.target.value })}
              className="settings-input"
            />
          </div>
          <div className="space-y-[var(--space-md)]">
            <Label className="settings-label">Timezone</Label>
            <Input
              placeholder="e.g. America/Los_Angeles"
              value={data.calTimezone || ""}
              onChange={(e) => onChange({ calTimezone: e.target.value })}
              className="settings-input"
            />
          </div>
          <div className="space-y-[var(--space-md)]">
            <Label className="settings-label">Event Type ID</Label>
            <Input
              placeholder="Auto-filled after connection"
              value={data.calEventTypeId || ""}
              onChange={(e) => onChange({ calEventTypeId: e.target.value })}
              className="settings-input"
              disabled
            />
          </div>
        </div>

        {/* Cal.com Connection Button */}
        <div className="mt-4 flex items-center gap-4">
          <Button
            onClick={async () => {
              if (!data.calApiKey || !data.calEventTypeSlug || !data.calTimezone) {
                setCalError("Please fill in API Key, Event Type Slug, and Timezone");
                return;
              }
              
              setCalSubmitting(true);
              setCalError(null);
              setCalSuccess(null);
              
              try {
                const resp = await setupCalEventType({ 
                  apiKey: data.calApiKey, 
                  eventTypeSlug: data.calEventTypeSlug, 
                  timezone: data.calTimezone 
                });
                
                onChange({ calEventTypeId: resp.eventTypeId });
                setCalSuccess(`Connected: ${resp.eventTypeSlug} (#${resp.eventTypeId})`);
              } catch (e: any) {
                setCalError(e?.message || 'Failed to connect');
              } finally {
                setCalSubmitting(false);
              }
            }}
            disabled={calSubmitting || !data.calApiKey || !data.calEventTypeSlug || !data.calTimezone}
            className="mt-2"
          >
            {calSubmitting ? 'Connecting…' : 'Connect Cal.com'}
          </Button>
          
          {calSuccess && (
            <span className="text-sm text-green-600 font-medium">{calSuccess}</span>
          )}
          {calError && (
            <span className="text-sm text-destructive font-medium">{calError}</span>
          )}
        </div>
      </div>
      {/* Compliance & Recording */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">Compliance & Recording</h3>
          <p className="settings-card-description">
            Configure compliance settings and recording preferences
          </p>
        </div>

        <div className="space-y-[var(--space-lg)]">
          {/* HIPAA Compliant */}
          <div className="flex items-center space-x-[var(--space-md)]">
            <Checkbox
              id="hipaa-compliant"
              checked={data.hipaaCompliant}
              onCheckedChange={(checked) => onChange({ hipaaCompliant: !!checked })}
            />
            <div className="space-y-1">
              <Label htmlFor="hipaa-compliant" className="settings-label !mb-0">
                HIPAA Compliant
              </Label>
              <p className="text-[var(--text-xs)] text-theme-secondary">
                Enable HIPAA compliance for healthcare applications
              </p>
            </div>
          </div>

          {/* Recording Enabled */}
          <div className="flex items-center space-x-[var(--space-md)]">
            <Checkbox
              id="recording-enabled"
              checked={data.recordingEnabled}
              onCheckedChange={(checked) => onChange({ recordingEnabled: !!checked })}
            />
            <div className="space-y-1">
              <Label htmlFor="recording-enabled" className="settings-label !mb-0">
                Recording Enabled
              </Label>
              <p className="text-[var(--text-xs)] text-theme-secondary">
                Record audio for all calls
              </p>
            </div>
          </div>

          {/* Video Recording Enabled */}
          <div className="flex items-center space-x-[var(--space-md)]">
            <Checkbox
              id="video-recording-enabled"
              checked={data.videoRecordingEnabled}
              onCheckedChange={(checked) => onChange({ videoRecordingEnabled: !!checked })}
            />
            <div className="space-y-1">
              <Label htmlFor="video-recording-enabled" className="settings-label !mb-0">
                Video Recording Enabled
              </Label>
              <p className="text-[var(--text-xs)] text-theme-secondary">
                Record video for all calls (when available)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call Management */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">Call Management</h3>
          <p className="settings-card-description">
            Configure call duration limits and ending behavior
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-xl)]">
          {/* End Call Message */}
          <div className="space-y-[var(--space-md)]">
            <Label className="settings-label">End Call Message</Label>
            <Textarea
              placeholder="Thank you for calling. Have a great day!"
              value={data.endCallMessage}
              onChange={(e) => onChange({ endCallMessage: e.target.value })}
              className="min-h-[80px] settings-input"
            />
          </div>

          {/* Max Call Duration */}
          <div className="space-y-[var(--space-md)]">
            <Label className="settings-label">Max Call Duration (seconds)</Label>
            <Input
              type="number"
              value={data.maxCallDuration}
              onChange={(e) => onChange({ maxCallDuration: parseInt(e.target.value) || 0 })}
              className="settings-input"
            />
          </div>
        </div>
      </div>

      {/* End Call Phrases */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">End Call Phrases</h3>
          <p className="settings-card-description">
            Define phrases that will trigger the end of a call
          </p>
        </div>

        <div className="space-y-[var(--space-lg)]">
          {data.endCallPhrases.map((phrase, index) => (
            <div key={index} className="flex gap-[var(--space-md)] items-center">
              <Input
                placeholder="Enter end call phrase"
                value={phrase}
                onChange={(e) => updateEndCallPhrase(index, e.target.value)}
                className="settings-input flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEndCallPhrase(index)}
                className="h-10 w-10 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addEndCallPhrase}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add End Call Phrase
          </Button>
        </div>
      </div>

      {/* Idle Messages */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">Idle Messages</h3>
          <p className="settings-card-description">
            Configure messages to send when the caller is silent
          </p>
        </div>

        <div className="space-y-[var(--space-lg)]">
          {data.idleMessages.map((message, index) => (
            <div key={index} className="flex gap-[var(--space-md)] items-center">
              <Input
                placeholder="Enter idle message"
                value={message}
                onChange={(e) => updateIdleMessage(index, e.target.value)}
                className="settings-input flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeIdleMessage(index)}
                className="h-10 w-10 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addIdleMessage}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Idle Message
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)]">
            <div className="space-y-[var(--space-md)]">
              <Label className="settings-label">Idle Message Max Spoken Count</Label>
              <Input
                type="number"
                value={data.idleMessageMaxSpokenCount}
                onChange={(e) => onChange({ idleMessageMaxSpokenCount: parseInt(e.target.value) || 0 })}
                className="settings-input"
              />
            </div>
            <div className="space-y-[var(--space-md)]">
              <Label className="settings-label">Silence Timeout (seconds)</Label>
              <Input
                type="number"
                value={data.silenceTimeoutSeconds}
                onChange={(e) => onChange({ silenceTimeoutSeconds: parseInt(e.target.value) || 0 })}
                className="settings-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Response Settings */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">Response Settings</h3>
          <p className="settings-card-description">
            Fine-tune response timing and interruption behavior
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-xl)]">
          <div className="space-y-[var(--space-xl)]">
            {/* Response Delay */}
            <div className="space-y-[var(--space-md)]">
              <Label className="settings-label">Response Delay (seconds)</Label>
              <WizardSlider
                value={data.responseDelaySeconds}
                onChange={(value) => onChange({ responseDelaySeconds: value })}
                min={0}
                max={5}
                step={0.1}
                leftLabel="Immediate"
                rightLabel="Delayed"
              />
            </div>

            {/* LLM Request Delay */}
            <div className="space-y-[var(--space-md)]">
              <Label className="settings-label">LLM Request Delay (seconds)</Label>
              <WizardSlider
                value={data.llmRequestDelaySeconds}
                onChange={(value) => onChange({ llmRequestDelaySeconds: value })}
                min={0}
                max={2}
                step={0.1}
                leftLabel="Fast"
                rightLabel="Slow"
              />
            </div>
          </div>

          <div className="space-y-[var(--space-xl)]">
            {/* Words to Interrupt */}
            <div className="space-y-[var(--space-md)]">
              <Label className="settings-label">Words to Interrupt Assistant</Label>
              <WizardSlider
                value={data.numWordsToInterruptAssistant}
                onChange={(value) => onChange({ numWordsToInterruptAssistant: value })}
                min={1}
                max={10}
                step={1}
                leftLabel="1 word"
                rightLabel="10 words"
                showValue={true}
              />
            </div>

            {/* Max Duration */}
            <div className="space-y-[var(--space-md)]">
              <Label className="settings-label">Max Duration (seconds)</Label>
              <Input
                type="number"
                value={data.maxDurationSeconds}
                onChange={(e) => onChange({ maxDurationSeconds: parseInt(e.target.value) || 0 })}
                className="settings-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Sound */}
      <div className="settings-card">
        <div className="space-y-[var(--space-md)]">
          <h3 className="settings-card-title">Background Sound</h3>
          <p className="settings-card-description">
            Add ambient background sounds to enhance the call experience
          </p>
        </div>

        <div className="space-y-[var(--space-md)]">
          <Label className="settings-label">Background Sound</Label>
          <Select 
            value={data.backgroundSound} 
            onValueChange={(value) => onChange({ backgroundSound: value })}
          >
            <SelectTrigger className="settings-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="cafe">Cafe</SelectItem>
              <SelectItem value="nature">Nature</SelectItem>
              <SelectItem value="white-noise">White Noise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};