import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, X, ChevronDown, Shield, Mic, Video, Music, Phone, MessageSquare, ArrowRightLeft, Check } from "lucide-react";
import { AdvancedData } from "./types";
import { WizardSlider } from "./WizardSlider";

interface AdvancedTabProps {
  data: AdvancedData;
  onChange: (data: Partial<AdvancedData>) => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({ data, onChange }) => {
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const countries = [
    { code: "+1", flag: "🇺🇸", name: "United States" },
    { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
    { code: "+33", flag: "🇫🇷", name: "France" },
    { code: "+49", flag: "🇩🇪", name: "Germany" },
    { code: "+81", flag: "🇯🇵", name: "Japan" },
    { code: "+86", flag: "🇨🇳", name: "China" },
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+61", flag: "🇦🇺", name: "Australia" },
    { code: "+55", flag: "🇧🇷", name: "Brazil" },
    { code: "+7", flag: "🇷🇺", name: "Russia" },
    { code: "+34", flag: "🇪🇸", name: "Spain" },
    { code: "+39", flag: "🇮🇹", name: "Italy" },
    { code: "+31", flag: "🇳🇱", name: "Netherlands" },
    { code: "+46", flag: "🇸🇪", name: "Sweden" },
    { code: "+47", flag: "🇳🇴", name: "Norway" }
  ];

  const selectedCountry = countries.find(c => c.code === (data.transferCountryCode || "+1"));

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

  return (
    <div className="max-w-4xl space-y-[var(--space-2xl)]">
      {/* Privacy & Security */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Privacy & Security</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how calls are protected and recorded
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          <div className="space-y-[var(--space-lg)]">
            {/* HIPAA Compliant */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-[var(--space-md)]">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">HIPAA Compliant</Label>
                  <p className="text-xs text-muted-foreground">
                    Enables HIPAA compliance for healthcare applications and ensures protected health information is handled securely.
                  </p>
                </div>
              </div>
              <Switch
                checked={data.hipaaCompliant}
                onCheckedChange={(checked) => onChange({ hipaaCompliant: checked })}
              />
            </div>

            {/* PCI Compliant */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-[var(--space-md)]">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">PCI Compliant</Label>
                  <p className="text-xs text-muted-foreground">
                    Ensures payment card data is handled according to PCI DSS standards for secure financial transactions.
                  </p>
                </div>
              </div>
              <Switch
                checked={data.pciCompliant}
                onCheckedChange={(checked) => onChange({ pciCompliant: checked })}
              />
            </div>

            {/* Audio Recording */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-[var(--space-md)]">
                <Mic className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Audio Recording</Label>
                  <p className="text-xs text-muted-foreground">
                    Records audio for all calls to enable call monitoring, quality assurance, and compliance purposes.
                  </p>
                </div>
              </div>
              <Switch
                checked={data.recordingEnabled}
                onCheckedChange={(checked) => onChange({ recordingEnabled: checked })}
              />
            </div>

            {/* Audio Recording Format */}
            {data.recordingEnabled && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-[var(--space-md)]">
                  <Music className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Audio Recording Format</Label>
                    <p className="text-xs text-muted-foreground">
                      Select the audio format for recorded calls. WAV provides highest quality while MP3 saves storage space.
                    </p>
                  </div>
                </div>
                <Select 
                  value={data.audioRecordingFormat} 
                  onValueChange={(value) => onChange({ audioRecordingFormat: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="mp3">MP3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Video Recording */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-[var(--space-md)]">
                <Video className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Video Recording</Label>
                  <p className="text-xs text-muted-foreground">
                    Records video when available during calls for enhanced monitoring and analysis capabilities.
                  </p>
                </div>
              </div>
              <Switch
                checked={data.videoRecordingEnabled}
                onCheckedChange={(checked) => onChange({ videoRecordingEnabled: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voicemail Detection */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Voicemail Detection</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure automatic voicemail delivery
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          {/* Leave Voicemail Messages */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[var(--space-md)]">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Leave Voicemail Messages</Label>
                <p className="text-xs text-muted-foreground">
                  Enable automatic voicemail delivery when an answering machine is detected
                </p>
              </div>
            </div>
            <Switch
              checked={data.voicemailDetectionEnabled}
              onCheckedChange={(checked) => onChange({ voicemailDetectionEnabled: checked })}
            />
          </div>

          {/* Custom Voicemail Message */}
          {data.voicemailDetectionEnabled && (
            <div className="space-y-[var(--space-md)]">
              <Label className="text-sm font-medium">Voicemail Message</Label>
              <p className="text-xs text-muted-foreground mb-[var(--space-md)]">
                Custom message to leave when voicemail is detected (optional)
              </p>
              <Textarea
                placeholder="Hi, this is [Assistant Name]. I was calling regarding..."
                value={data.voicemailMessage || ""}
                onChange={(e) => onChange({ voicemailMessage: e.target.value })}
                rows={3}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Transfer */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Call Transfer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure call transfer settings to route calls to another number
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          {/* Transfer Phone Number */}
          <div className="space-y-[var(--space-md)]">
            <Label className="text-sm font-medium">Phone Number</Label>
            <p className="text-xs text-muted-foreground mb-[var(--space-md)]">
              The phone number to transfer calls to when transfer conditions are met
            </p>
            <div className="flex gap-2">
              <Popover open={isCountryDropdownOpen} onOpenChange={setIsCountryDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCountryDropdownOpen}
                    className="w-24 h-12 justify-between text-left font-normal"
                  >
                    {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : "+1"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {countries.map((country) => (
                          <CommandItem
                            key={country.code}
                            value={`${country.name} ${country.code}`}
                            onSelect={() => {
                              onChange({ transferCountryCode: country.code });
                              setIsCountryDropdownOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                (data.transferCountryCode || "+1") === country.code ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="mr-2">{country.flag}</span>
                            <span className="mr-2">{country.code}</span>
                            <span className="text-muted-foreground">{country.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Phone number"
                value={data.transferPhoneNumber || ""}
                onChange={(e) => onChange({ transferPhoneNumber: e.target.value })}
                className="flex-1 h-12"
              />
            </div>
          </div>

          {/* Transfer Sentence */}
          <div className="space-y-[var(--space-md)]">
            <Label className="text-sm font-medium">Transfer Sentence</Label>
            <p className="text-xs text-muted-foreground mb-[var(--space-md)]">
              What the assistant will say before transferring the call
            </p>
            <Textarea
              placeholder="I'm going to transfer you to someone who can better help you with that..."
              value={data.transferSentence || ""}
              onChange={(e) => onChange({ transferSentence: e.target.value })}
              rows={2}
              className="w-full"
            />
          </div>

          {/* Transfer Condition */}
          <div className="space-y-[var(--space-md)]">
            <Label className="text-sm font-medium">Transfer Condition</Label>
            <p className="text-xs text-muted-foreground mb-[var(--space-md)]">
              Describe when the assistant should transfer the call
            </p>
            <Textarea
              placeholder="Transfer when the customer asks to speak to a manager or requests technical support..."
              value={data.transferCondition || ""}
              onChange={(e) => onChange({ transferCondition: e.target.value })}
              rows={2}
              className="w-full"
            />
          </div>

          {/* Transfer Type */}
          <div className="space-y-[var(--space-md)]">
            <Label className="text-sm font-medium">Transfer Type</Label>
            <p className="text-xs text-muted-foreground mb-[var(--space-md)]">
              Choose between warm (announced) or cold (blind) transfer
            </p>
            <RadioGroup
              value={data.transferType || "warm"}
              onValueChange={(value: "warm" | "cold") => onChange({ transferType: value })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="warm" id="warm" />
                <Label htmlFor="warm" className="text-sm font-normal cursor-pointer">
                  Warm Transfer
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cold" id="cold" />
                <Label htmlFor="cold" className="text-sm font-normal cursor-pointer">
                  Cold Transfer
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>


      {/* Response Settings */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Response Settings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fine-tune response timing and interruption behavior
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-xl)]">
            <div className="space-y-[var(--space-xl)]">
              {/* Response Delay */}
              <div className="space-y-[var(--space-md)]">
                <Label className="text-sm font-medium">Response Delay (seconds)</Label>
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
                <Label className="text-sm font-medium">LLM Request Delay (seconds)</Label>
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
                <Label className="text-sm font-medium">Words to Interrupt Assistant</Label>
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
                <Label className="text-sm font-medium">Max Duration (seconds)</Label>
                <Input
                  type="number"
                  value={data.maxDurationSeconds}
                  onChange={(e) => onChange({ maxDurationSeconds: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Sound */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Background Sound</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add ambient background sounds to enhance the call experience
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          <div className="space-y-[var(--space-md)]">
            <Label className="text-sm font-medium">Background Sound</Label>
            <Select 
              value={data.backgroundSound} 
              onValueChange={(value) => onChange({ backgroundSound: value })}
            >
              <SelectTrigger>
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
        </CardContent>
      </Card>
    </div>
  );
};