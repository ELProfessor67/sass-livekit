import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronDown, Info } from "lucide-react";
import { VoiceData } from "./types";
import { WizardSlider } from "./WizardSlider";

interface VoiceTabProps {
  data: VoiceData;
  onChange: (data: Partial<VoiceData>) => void;
}

export const VoiceTab: React.FC<VoiceTabProps> = ({ data, onChange }) => {
  const [advancedTimingOpen, setAdvancedTimingOpen] = useState(false);
  const [advancedInterruptionOpen, setAdvancedInterruptionOpen] = useState(false);
  const [advancedTimeoutOpen, setAdvancedTimeoutOpen] = useState(false);

  return (
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-[28px] font-light tracking-[0.2px] mb-2">
          Voice Identity
        </h1>
        <p className="text-[1.08rem] pr-2 max-w-xl text-muted-foreground">
          Define how your assistant sounds to create a memorable brand experience.
        </p>
      </div>

      {/* Card 1 - Voice Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Voice Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Provider, Voice, Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Provider</Label>
              <Select value={data.provider} onValueChange={(value) => onChange({ provider: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Azure">Azure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Voice</Label>
              <Select value={data.voice} onValueChange={(value) => onChange({ voice: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rachel">Rachel</SelectItem>
                  <SelectItem value="Domi">Domi</SelectItem>
                  <SelectItem value="Bella">Bella</SelectItem>
                  <SelectItem value="Antoni">Antoni</SelectItem>
                  <SelectItem value="Elli">Elli</SelectItem>
                  <SelectItem value="Josh">Josh</SelectItem>
                  <SelectItem value="Arnold">Arnold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Model</Label>
              <Select value={data.model || "eleven_turbo_v2_5"} onValueChange={(value) => onChange({ model: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eleven_turbo_v2_5">Eleven Turbo v2.5</SelectItem>
                  <SelectItem value="eleven_multilingual_v2">Eleven Multilingual v2</SelectItem>
                  <SelectItem value="eleven_monolingual_v1">Eleven Monolingual v1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice Sliders */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="w-[60%]">
                <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Stability</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Controls voice consistency</p>
              </div>
              <div className="w-[300px] flex items-center gap-3">
                <WizardSlider
                  value={data.stability}
                  onChange={(value) => onChange({ stability: value })}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <span className="text-primary font-mono w-12 text-right">{data.stability.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="w-[60%]">
                <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Clarity</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Voice clarity enhancement</p>
              </div>
              <div className="w-[300px] flex items-center gap-3">
                <WizardSlider
                  value={data.clarity || 0.75}
                  onChange={(value) => onChange({ clarity: value })}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <span className="text-primary font-mono w-12 text-right">{(data.clarity || 0.75).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="w-[60%]">
                <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Speed</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Speech rate control</p>
              </div>
              <div className="w-[300px] flex items-center gap-3">
                <WizardSlider
                  value={data.speed}
                  onChange={(value) => onChange({ speed: value })}
                  min={0.25}
                  max={4}
                  step={0.01}
                />
                <span className="text-primary font-mono w-12 text-right">{data.speed.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="w-[60%]">
                <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Style Exaggeration</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Voice expressiveness</p>
              </div>
              <div className="w-[300px] flex items-center gap-3">
                <WizardSlider
                  value={data.style}
                  onChange={(value) => onChange({ style: value })}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <span className="text-primary font-mono w-12 text-right">{data.style.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="w-[60%]">
                <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Streaming Latency</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Response timing optimization</p>
              </div>
              <div className="w-[300px] flex items-center gap-3">
                <WizardSlider
                  value={data.latency || 0}
                  onChange={(value) => onChange({ latency: value })}
                  min={0}
                  max={4}
                  step={1}
                />
                <span className="text-primary font-mono w-12 text-right">{data.latency || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - Additional Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[20px] font-medium tracking-[0.2px]">Additional Configuration</CardTitle>
          <CardDescription>Configure additional settings for the voice of your assistant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Config Adapter Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Background Sound</Label>
              <Select value={data.backgroundSound || "off"} onValueChange={(value) => onChange({ backgroundSound: value })}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="lounge">Lounge</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Input Min Characters</Label>
              <div className="w-[300px]">
                <Input 
                  type="number"
                  value={data.inputMinCharacters || 10}
                  onChange={(e) => onChange({ inputMinCharacters: Math.max(10, Math.min(100, parseInt(e.target.value) || 10)) })}
                  className="h-10 px-3 w-32"
                  min={10}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Provider Settings Section */}
          {data.provider === "ElevenLabs" && (
            <>
              <div className="pt-2 border-t border-border">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Stability</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Controls voice consistency</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.stability}
                        onChange={(value) => onChange({ stability: value })}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                      <span className="text-primary font-mono w-12 text-right">{data.stability.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Clarity</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Voice clarity enhancement</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.clarity || 0.75}
                        onChange={(value) => onChange({ clarity: value })}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                      <span className="text-primary font-mono w-12 text-right">{(data.clarity || 0.75).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Speed</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Speech rate control</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.speed}
                        onChange={(value) => onChange({ speed: value })}
                        min={0.25}
                        max={4}
                        step={0.01}
                      />
                      <span className="text-primary font-mono w-12 text-right">{data.speed.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Style Exaggeration</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Voice expressiveness</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.style}
                        onChange={(value) => onChange({ style: value })}
                        min={0}
                        max={2}
                        step={0.01}
                      />
                      <span className="text-primary font-mono w-12 text-right">{data.style.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Streaming Latency</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Response timing optimization</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.latency || 0}
                        onChange={(value) => onChange({ latency: value })}
                        min={0}
                        max={4}
                        step={1}
                      />
                      <span className="text-primary font-mono w-12 text-right">{data.latency || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[16px] font-semibold tracking-[0.2px]">Use Speaker Boost</Label>
                      <p className="text-sm text-muted-foreground">Boost voice similarity at some cost to speed.</p>
                    </div>
                    <Switch 
                      checked={data.useSpeakerBoost || false}
                      onCheckedChange={(checked) => onChange({ useSpeakerBoost: checked })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Info Box for Non-ElevenLabs */}
          {data.provider !== "ElevenLabs" && (
            <div className="py-3 bg-muted rounded-md px-4 flex gap-3">
              <Info className="h-[18px] w-[18px] text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enhanced voice customization features are available with ElevenLabs provider.
                </p>
                <p className="text-sm text-muted-foreground">
                  Switch to ElevenLabs to access advanced voice stability, clarity, speed, and style controls for superior voice quality and customization.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3 - Start Speaking Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[20px] font-medium tracking-[0.2px]">Start Speaking Plan</CardTitle>
          <CardDescription>This is the plan for when the assistant should start talking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="w-[60%]">
              <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Wait Seconds</Label>
            </div>
            <div className="w-[300px] flex items-center gap-3">
              <div className="flex-1 relative">
                <WizardSlider
                  value={data.waitSeconds || 0.4}
                  onChange={(value) => onChange({ waitSeconds: value })}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Shorter</span>
                  <span>Longer</span>
                </div>
              </div>
              <span className="text-primary font-mono w-12 text-right">{(data.waitSeconds || 0.4).toFixed(1)}s</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Smart Endpointing</Label>
              <p className="text-sm text-muted-foreground">Enable for more accurate speech endpoint detection. LiveKit is only available in English.</p>
            </div>
            <Select value={data.smartEndpointing || "off"} onValueChange={(value) => onChange({ smartEndpointing: value })}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="on">On</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={advancedTimingOpen} onOpenChange={setAdvancedTimingOpen}>
            <CollapsibleTrigger className="flex w-full justify-between items-center border-t pt-4">
              <span className="text-sm font-medium">Advanced Timing Settings</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${advancedTimingOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-8">
              <div className="flex items-center justify-between">
                <div className="w-[60%]">
                  <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">On Punctuation</Label>
                </div>
                <div className="w-[300px] flex items-center gap-3">
                  <WizardSlider
                    value={data.timingSlider1 || 0.1}
                    onChange={(value) => onChange({ timingSlider1: value })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                  <span className="text-primary font-mono w-12 text-right">{(data.timingSlider1 || 0.1).toFixed(1)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-[60%]">
                  <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">On No Punctuation</Label>
                </div>
                <div className="w-[300px] flex items-center gap-3">
                  <WizardSlider
                    value={data.timingSlider2 || 1.5}
                    onChange={(value) => onChange({ timingSlider2: value })}
                    min={0}
                    max={10}
                    step={0.1}
                  />
                  <span className="text-primary font-mono w-12 text-right">{(data.timingSlider2 || 1.5).toFixed(1)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-[60%]">
                  <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">On Number</Label>
                </div>
                <div className="w-[300px] flex items-center gap-3">
                  <WizardSlider
                    value={data.timingSlider3 || 0.5}
                    onChange={(value) => onChange({ timingSlider3: value })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                  <span className="text-primary font-mono w-12 text-right">{(data.timingSlider3 || 0.5).toFixed(1)}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Card 4 - Stop Speaking Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[20px] font-medium tracking-[0.2px]">Stop Speaking Plan</CardTitle>
          <CardDescription>This is the plan for when the assistant should stop talking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="border-b pb-6">
            <div className="flex items-center justify-between">
              <div className="w-[60%]">
                <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Number of Words</Label>
              </div>
              <div className="w-[300px] flex items-center gap-3">
                <WizardSlider
                  value={data.numWordsToInterrupt || 0}
                  onChange={(value) => onChange({ numWordsToInterrupt: value })}
                  min={0}
                  max={10}
                  step={1}
                />
                <span className="text-primary font-mono w-12 text-right">{data.numWordsToInterrupt || 0}</span>
              </div>
            </div>
          </div>

          <Collapsible open={advancedInterruptionOpen} onOpenChange={setAdvancedInterruptionOpen}>
            <CollapsibleTrigger className="flex w-full justify-between items-center border-t pt-4">
              <span className="text-sm font-medium">Advanced Interruption Settings</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${advancedInterruptionOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-8">
              <div className="flex items-center justify-between">
                <div className="w-[60%]">
                  <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Voice Seconds</Label>
                </div>
                <div className="w-[300px] flex items-center gap-3">
                  <WizardSlider
                    value={data.voiceSeconds || 0.2}
                    onChange={(value) => onChange({ voiceSeconds: value })}
                    min={0}
                    max={0.5}
                    step={0.01}
                  />
                  <span className="text-primary font-mono w-16 text-right">{(data.voiceSeconds || 0.2).toFixed(2)} (sec)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-[60%]">
                  <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Back Off Seconds</Label>
                </div>
                <div className="w-[300px] flex items-center gap-3">
                  <WizardSlider
                    value={data.backOffSeconds || 1}
                    onChange={(value) => onChange({ backOffSeconds: value })}
                    min={0}
                    max={10}
                    step={1}
                  />
                  <span className="text-primary font-mono w-16 text-right">{data.backOffSeconds || 1} (sec)</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Card 5 - Call Timeout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[20px] font-medium tracking-[0.2px]">Call Timeout Settings</CardTitle>
          <CardDescription>Configure when the assistant should end a call based on silence or duration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="w-[60%]">
              <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Silence Timeout</Label>
            </div>
            <div className="w-[300px] flex items-center gap-3">
              <div className="flex-1 relative">
                <WizardSlider
                  value={data.silenceTimeout || 30}
                  onChange={(value) => onChange({ silenceTimeout: value })}
                  min={10}
                  max={3600}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10s</span>
                  <span>3600s</span>
                </div>
              </div>
              <span className="text-primary font-mono w-16 text-right">{data.silenceTimeout || 30}s</span>
            </div>
          </div>

          <Collapsible open={advancedTimeoutOpen} onOpenChange={setAdvancedTimeoutOpen}>
            <CollapsibleTrigger className="flex w-full justify-between items-center border-t pt-4">
              <span className="text-sm font-medium">Advanced Settings</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${advancedTimeoutOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="w-[60%]">
                  <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Maximum Duration</Label>
                </div>
                <div className="w-[300px] flex items-center gap-3">
                  <div className="flex-1 relative">
                    <WizardSlider
                      value={data.maxDuration || 1800}
                      onChange={(value) => onChange({ maxDuration: value })}
                      min={10}
                      max={43200}
                      step={10}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>10s</span>
                      <span>43200s</span>
                    </div>
                  </div>
                  <span className="text-primary font-mono w-16 text-right">{data.maxDuration || 1800}s</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};