import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  // Filter voices based on selected provider
  const getFilteredVoices = () => {
    switch (data.provider) {
      case "ElevenLabs":
        return [
          { value: "Rachel", label: "Rachel" },
          { value: "Domi", label: "Domi" },
          { value: "Bella", label: "Bella" },
          { value: "Antoni", label: "Antoni" },
          { value: "Elli", label: "Elli" },
          { value: "Josh", label: "Josh" },
          { value: "Arnold", label: "Arnold" }
        ];
      case "Rime":
        // Show only Arcana voices when Arcana model is selected
        if (data.model === "arcana") {
          return [
            { value: "luna", label: "Luna - female, chill but excitable, gen-z optimist" },
            { value: "ursa", label: "Ursa - male, 20 years old, encyclopedic knowledge of 2000s emo" },
            { value: "astra", label: "Astra - female, young, wide-eyed" },
            { value: "walnut", label: "Walnut" },
            { value: "miyamoto_akari", label: "Miyamoto Akari" },
            { value: "marlu", label: "Marlu" }
          ];
        }
        // Show other Rime voices for other models
        return [
          { value: "ana", label: "Ana" },
          { value: "amber", label: "Amber" },
          { value: "amalia", label: "Amalia" },
          { value: "alpine", label: "Alpine" },
          { value: "alona", label: "Alona" },
          { value: "ally", label: "Ally" },
          { value: "walnut", label: "Walnut" },
          { value: "miyamoto_akari", label: "Miyamoto Akari" },
          { value: "patel_amit", label: "Patel Amit" },
          { value: "celeste", label: "Celeste" },
          { value: "kima", label: "Kima" },
          { value: "marlu", label: "Marlu" },
          { value: "morel_marianne", label: "Morel Marianne" },
          { value: "solstice", label: "Solstice" },
          { value: "livet_aurelie", label: "Livet Aurelie" },
          { value: "destin", label: "Destin" }
        ];
      case "Hume":
        // Default Hume voices only (Octave-2 disabled)
        return [
          { value: "Colton Rivers", label: "Colton Rivers" },
          { value: "Sarah Chen", label: "Sarah Chen" },
          { value: "David Mitchell", label: "David Mitchell" },
          { value: "Emma Williams", label: "Emma Williams" },
          { value: "Charming Cowgirl", label: "Charming Cowgirl" },
          { value: "Soft Male Conversationalist", label: "Soft Male Conversationalist" },
          { value: "Scottish Guy", label: "Scottish Guy" },
          { value: "Conversational English Guy", label: "Conversational English Guy" },
          { value: "English Casual Conversationalist", label: "English Casual Conversationalist" }
        ];
      case "Deepgram":
        // Show only the selected model as a voice option
        // In Deepgram, model and voice are the same
        if (data.model) {
          return [
            { value: data.model, label: getFilteredModels().find(m => m.value === data.model)?.label || data.model }
          ];
        }
        return [
          { value: "aura-asteria-en", label: "Aura Asteria" }
        ];
      case "Cartesia":
        // Cartesia Sonic 3 voices with names
        return [
          { value: "41468051-3a85-4b68-92ad-64add250d369", label: "Cory" },
          { value: "6c64b57a-bc65-48e4-bff4-12dbe85606cd", label: "Eloise" },
          { value: "95d51f79-c397-46f9-b49a-23763d3eaa2d", label: "Arushi" },
          { value: "9cebb910-d4b7-4a4a-85a4-12c79137724c", label: "Aarti" },
          { value: "a01c369f-6d2d-4185-bc20-b32c225eab70", label: "Fiona" },
          { value: "726d5ae5-055f-4c3d-8355-d9677de68937", label: "Troy" },
          { value: "ce74c4da-4aee-435d-bc6d-81d1a9367e12", label: "Maroc" },
          { value: "22f1a356-56c2-4428-bc91-2ab2e6d0c215", label: "Isabelle" },
          { value: "ee8b13e7-98af-4b15-89d1-8d402be10c94", label: "Carson" },
          { value: "5cad89c9-d88a-4832-89fb-55f2f16d13d3", label: "Brandon - Emotive" },
          { value: "e07c00bc-4134-4eae-9ea4-1a55fb45746b", label: "Brooke - Emotive" },
          { value: "6ccbfb76-1fc6-48f7-b71d-91ac6298247b", label: "Tessa - Emotive" },
          { value: "ec1e269e-9ca0-402f-8a18-58e0e022355a", label: "Ariana - Emotive" }
        ];
      default:
        return [];
    }
  };

  // Filter models based on selected provider
  const getFilteredModels = () => {
    switch (data.provider) {
      case "ElevenLabs":
        return [
          { value: "eleven_turbo_v2", label: "Eleven Turbo v2" },
          { value: "eleven_multilingual_v2", label: "Eleven Multilingual v2" }
        ];
      case "Rime":
        return [
          { value: "mistv2", label: "Mist v2" },
          { value: "arcana", label: "Arcana" }
        ];
      case "Hume":
        return [
          { value: "hume_default", label: "Hume Default" }
        ];
      case "Deepgram":
        return [
          { value: "aura-2-thalia-en", label: "Aura 2 - Thalia" },
          { value: "aura-2-andromeda-en", label: "Aura 2 - Andromeda" },
          { value: "aura-2-helena-en", label: "Aura 2 - Helena" },
          { value: "aura-2-apollo-en", label: "Aura 2 - Apollo" },
          { value: "aura-2-arcas-en", label: "Aura 2 - Arcas" },
          { value: "aura-2-aries-en", label: "Aura 2 - Aries" },
          { value: "aura-asteria-en", label: "Aura Asteria" },
          { value: "aura-luna-en", label: "Aura Luna" },
          { value: "aura-stella-en", label: "Aura Stella" },
          { value: "aura-athena-en", label: "Aura Athena" },
          { value: "aura-hera-en", label: "Aura Hera" },
          { value: "aura-orion-en", label: "Aura Orion" },
          { value: "aura-arcas-en", label: "Aura Arcas" },
          { value: "aura-perseus-en", label: "Aura Perseus" },
          { value: "aura-angus-en", label: "Aura Angus" },
          { value: "aura-orpheus-en", label: "Aura Orpheus" },
          { value: "aura-helios-en", label: "Aura Helios" },
          { value: "aura-zeus-en", label: "Aura Zeus" }
        ];
      case "Cartesia":
        return [
          { value: "sonic-3", label: "Sonic 3" }
        ];
      default:
        return [];
    }
  };

  // Handle provider change and reset voice/model if needed
  const handleProviderChange = (value: string) => {
    // Get filtered options for the new provider
    const getFilteredVoicesForProvider = (provider: string) => {
      switch (provider) {
        case "ElevenLabs":
          return [
            { value: "Rachel", label: "Rachel" },
            { value: "Domi", label: "Domi" },
            { value: "Bella", label: "Bella" },
            { value: "Antoni", label: "Antoni" },
            { value: "Elli", label: "Elli" },
            { value: "Josh", label: "Josh" },
            { value: "Arnold", label: "Arnold" }
          ];
        case "Rime":
          // For provider changes, show all Rime voices
          // They will be filtered by getFilteredVoices() based on selected model
          return [
            { value: "ana", label: "Ana" },
            { value: "amber", label: "Amber" },
            { value: "amalia", label: "Amalia" },
            { value: "alpine", label: "Alpine" },
            { value: "alona", label: "Alona" },
            { value: "ally", label: "Ally" },
            { value: "luna", label: "Luna - female, chill but excitable, gen-z optimist" },
            { value: "orion", label: "Orion - male, older, african american, happy" },
            { value: "ursa", label: "Ursa - male, 20 years old, encyclopedic knowledge of 2000s emo" },
            { value: "astra", label: "Astra - female, young, wide-eyed" },
            { value: "walnut", label: "Walnut" },
            { value: "miyamoto_akari", label: "Miyamoto Akari" },
            { value: "patel_amit", label: "Patel Amit" },
            { value: "celeste", label: "Celeste" },
            { value: "kima", label: "Kima" },
            { value: "marlu", label: "Marlu" },
            { value: "morel_marianne", label: "Morel Marianne" },
            { value: "solstice", label: "Solstice" },
            { value: "livet_aurelie", label: "Livet Aurelie" },
            { value: "destin", label: "Destin" }
          ];
        case "Hume":
          return [
            { value: "Colton Rivers", label: "Colton Rivers" },
            { value: "Sarah Chen", label: "Sarah Chen" },
            { value: "David Mitchell", label: "David Mitchell" },
            { value: "Emma Williams", label: "Emma Williams" },
            { value: "Charming Cowgirl", label: "Charming Cowgirl" },
            { value: "Soft Male Conversationalist", label: "Soft Male Conversationalist" },
            { value: "Scottish Guy", label: "Scottish Guy" },
            { value: "Conversational English Guy", label: "Conversational English Guy" },
            { value: "English Casual Conversationalist", label: "English Casual Conversationalist" }
          ];
        case "Deepgram":
          return [
            { value: "aura-2-thalia-en", label: "Aura 2 - Thalia" },
            { value: "aura-2-andromeda-en", label: "Aura 2 - Andromeda" },
            { value: "aura-2-helena-en", label: "Aura 2 - Helena" },
            { value: "aura-2-apollo-en", label: "Aura 2 - Apollo" },
            { value: "aura-2-arcas-en", label: "Aura 2 - Arcas" },
            { value: "aura-2-aries-en", label: "Aura 2 - Aries" },
            { value: "aura-asteria-en", label: "Aura Asteria" },
            { value: "aura-luna-en", label: "Aura Luna" },
            { value: "aura-stella-en", label: "Aura Stella" },
            { value: "aura-athena-en", label: "Aura Athena" },
            { value: "aura-hera-en", label: "Aura Hera" },
            { value: "aura-orion-en", label: "Aura Orion" },
            { value: "aura-arcas-en", label: "Aura Arcas" },
            { value: "aura-perseus-en", label: "Aura Perseus" },
            { value: "aura-angus-en", label: "Aura Angus" },
            { value: "aura-orpheus-en", label: "Aura Orpheus" },
            { value: "aura-helios-en", label: "Aura Helios" },
            { value: "aura-zeus-en", label: "Aura Zeus" }
          ];
        case "Cartesia":
          return [
            { value: "41468051-3a85-4b68-92ad-64add250d369", label: "Cory" },
            { value: "6c64b57a-bc65-48e4-bff4-12dbe85606cd", label: "Eloise" },
            { value: "95d51f79-c397-46f9-b49a-23763d3eaa2d", label: "Arushi" },
            { value: "9cebb910-d4b7-4a4a-85a4-12c79137724c", label: "Aarti" },
            { value: "a01c369f-6d2d-4185-bc20-b32c225eab70", label: "Fiona" },
            { value: "726d5ae5-055f-4c3d-8355-d9677de68937", label: "Troy" },
            { value: "ce74c4da-4aee-435d-bc6d-81d1a9367e12", label: "Maroc" },
            { value: "22f1a356-56c2-4428-bc91-2ab2e6d0c215", label: "Isabelle" },
            { value: "ee8b13e7-98af-4b15-89d1-8d402be10c94", label: "Carson" },
            { value: "5cad89c9-d88a-4832-89fb-55f2f16d13d3", label: "Brandon - Emotive" },
            { value: "e07c00bc-4134-4eae-9ea4-1a55fb45746b", label: "Brooke - Emotive" },
            { value: "6ccbfb76-1fc6-48f7-b71d-91ac6298247b", label: "Tessa - Emotive" },
            { value: "ec1e269e-9ca0-402f-8a18-58e0e022355a", label: "Ariana - Emotive" }
          ];
        default:
          return [];
      }
    };

    const getFilteredModelsForProvider = (provider: string) => {
      switch (provider) {
        case "ElevenLabs":
          return [
            { value: "eleven_turbo_v2", label: "Eleven Turbo v2" },
            { value: "eleven_multilingual_v2", label: "Eleven Multilingual v2" }
          ];
        case "Rime":
          return [
            { value: "mistv2", label: "Mist v2" },
            { value: "arcana", label: "Arcana" }
          ];
        case "Hume":
          return [
            { value: "hume_default", label: "Hume Default" }
          ];
        case "Deepgram":
          return [
            { value: "aura-2-thalia-en", label: "Aura 2 - Thalia" },
            { value: "aura-2-andromeda-en", label: "Aura 2 - Andromeda" },
            { value: "aura-2-helena-en", label: "Aura 2 - Helena" },
            { value: "aura-2-apollo-en", label: "Aura 2 - Apollo" },
            { value: "aura-2-arcas-en", label: "Aura 2 - Arcas" },
            { value: "aura-2-aries-en", label: "Aura 2 - Aries" },
            { value: "aura-asteria-en", label: "Aura Asteria" },
            { value: "aura-luna-en", label: "Aura Luna" },
            { value: "aura-stella-en", label: "Aura Stella" },
            { value: "aura-athena-en", label: "Aura Athena" },
            { value: "aura-hera-en", label: "Aura Hera" },
            { value: "aura-orion-en", label: "Aura Orion" },
            { value: "aura-arcas-en", label: "Aura Arcas" },
            { value: "aura-perseus-en", label: "Aura Perseus" },
            { value: "aura-angus-en", label: "Aura Angus" },
            { value: "aura-orpheus-en", label: "Aura Orpheus" },
            { value: "aura-helios-en", label: "Aura Helios" },
            { value: "aura-zeus-en", label: "Aura Zeus" }
          ];
        case "Cartesia":
          return [
            { value: "sonic-3", label: "Sonic 3" }
          ];
        default:
          return [];
      }
    };

    const filteredVoices = getFilteredVoicesForProvider(value);
    const filteredModels = getFilteredModelsForProvider(value);
    
    // Check if current voice is valid for new provider
    const isCurrentVoiceValid = filteredVoices.some(voice => voice.value === data.voice);
    const isCurrentModelValid = filteredModels.some(model => model.value === data.model);
    
    const updates: Partial<VoiceData> = { provider: value };
    
    // Reset model if not valid for new provider
    if (!isCurrentModelValid && filteredModels.length > 0) {
      updates.model = filteredModels[0].value;
    }
    
    // Reset voice if not valid for new provider
    // For Deepgram, voice should match the model
    if (value === "Deepgram" && filteredModels.length > 0) {
      updates.voice = updates.model || filteredModels[0].value;
    } else if (value === "Cartesia" && filteredVoices.length > 0) {
      // For Cartesia, use first Sonic 3 voice
      updates.voice = "41468051-3a85-4b68-92ad-64add250d369";
    } else if (!isCurrentVoiceValid && filteredVoices.length > 0) {
      updates.voice = filteredVoices[0].value;
    }
    
    onChange(updates);
  };

    // Handle model change and reset voice if needed
  const handleModelChange = (value: string) => {
    // For Deepgram, model and voice are the same
    if (data.provider === "Deepgram") {
      onChange({ model: value, voice: value });
      return;
    }
    
    // For Cartesia, use first voice when model changes
    if (data.provider === "Cartesia") {
      onChange({ model: value, voice: "41468051-3a85-4b68-92ad-64add250d369" });
      return;
    }
    
    // For Rime, check if current voice is valid for the new model
    if (data.provider === "Rime") {
      // Determine available voices for the new model
      let availableVoices;
      if (value === "arcana") {
        availableVoices = [
          { value: "luna", label: "Luna - female, chill but excitable, gen-z optimist" },
          { value: "ursa", label: "Ursa - male, 20 years old, encyclopedic knowledge of 2000s emo" },
          { value: "astra", label: "Astra - female, young, wide-eyed" },
          { value: "walnut", label: "Walnut" },
          { value: "miyamoto_akari", label: "Miyamoto Akari" },
          { value: "marlu", label: "Marlu" }
        ];
      } else {
        availableVoices = [
          { value: "ana", label: "Ana" },
          { value: "amber", label: "Amber" },
          { value: "amalia", label: "Amalia" },
          { value: "alpine", label: "Alpine" },
          { value: "alona", label: "Alona" },
          { value: "ally", label: "Ally" },
          { value: "walnut", label: "Walnut" },
          { value: "miyamoto_akari", label: "Miyamoto Akari" },
          { value: "patel_amit", label: "Patel Amit" },
          { value: "celeste", label: "Celeste" },
          { value: "kima", label: "Kima" },
          { value: "marlu", label: "Marlu" },
          { value: "morel_marianne", label: "Morel Marianne" },
          { value: "solstice", label: "Solstice" },
          { value: "livet_aurelie", label: "Livet Aurelie" },
          { value: "destin", label: "Destin" }
        ];
      }
      
      const isCurrentVoiceValid = availableVoices.some(voice => voice.value === data.voice);
      
      const updates: Partial<VoiceData> = { model: value };
      
      // Reset voice if not valid for new model
      if (!isCurrentVoiceValid && availableVoices.length > 0) {
        updates.voice = availableVoices[0].value;
      }
      
      onChange(updates);
    } 
    // For Hume, use default voices only (Octave-2 disabled)
    else if (data.provider === "Hume") {
      const defaultVoices = [
        { value: "Colton Rivers", label: "Colton Rivers" },
        { value: "Sarah Chen", label: "Sarah Chen" },
        { value: "David Mitchell", label: "David Mitchell" },
        { value: "Emma Williams", label: "Emma Williams" },
        { value: "Charming Cowgirl", label: "Charming Cowgirl" },
        { value: "Soft Male Conversationalist", label: "Soft Male Conversationalist" },
        { value: "Scottish Guy", label: "Scottish Guy" },
        { value: "Conversational English Guy", label: "Conversational English Guy" },
        { value: "English Casual Conversationalist", label: "English Casual Conversationalist" }
      ];
      
      const isCurrentVoiceValid = defaultVoices.some(voice => voice.value === data.voice);
      
      const updates: Partial<VoiceData> = { model: value };
      
      // Reset voice if not valid for new model
      if (!isCurrentVoiceValid && defaultVoices.length > 0) {
        updates.voice = defaultVoices[0].value;
      }
      
      onChange(updates);
    } else {
      onChange({ model: value });
    }
  };

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
              <Select value={data.provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Azure">Azure</SelectItem>
                  <SelectItem value="Rime">Rime</SelectItem>
                  <SelectItem value="Hume">Hume</SelectItem>
                  <SelectItem value="Deepgram">Deepgram</SelectItem>
                  <SelectItem value="Cartesia">Cartesia</SelectItem>
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
                  {getFilteredVoices().map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[16px] font-semibold tracking-[0.2px]">Model</Label>
              <Select value={data.model || "eleven_turbo_v2"} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredModels().map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
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

          {/* Rime Provider Settings */}
          {data.provider === "Rime" && (
            <>
              <div className="pt-2 border-t border-border">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Speed Alpha</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Controls speech rate (0.1-2.0)</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.speedAlpha || 0.9}
                        onChange={(value) => onChange({ speedAlpha: value })}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                      />
                      <span className="text-primary font-mono w-12 text-right">{(data.speedAlpha || 0.9).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[16px] font-semibold tracking-[0.2px]">Reduce Latency</Label>
                      <p className="text-sm text-muted-foreground">Optimize for lower latency at some cost to quality.</p>
                    </div>
                    <Switch 
                      checked={data.reduceLatency || true}
                      onCheckedChange={(checked) => onChange({ reduceLatency: checked })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Hume Provider Settings */}
          {data.provider === "Hume" && (
            <>
              <div className="pt-2 border-t border-border">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[16px] font-semibold tracking-[0.2px]">Voice Description</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Describe the voice characteristics for Hume AI</p>
                    <Textarea
                      placeholder="The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest."
                      value={data.voiceDescription || "The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest."}
                      onChange={(e) => onChange({ voiceDescription: e.target.value })}
                      rows={3}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Speed</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Speech rate control</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.speed || 1.0}
                        onChange={(value) => onChange({ speed: value })}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                      />
                      <span className="text-primary font-mono w-12 text-right">{(data.speed || 1.0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[16px] font-semibold tracking-[0.2px]">Instant Mode</Label>
                      <p className="text-sm text-muted-foreground">Enable instant mode for faster response times.</p>
                    </div>
                    <Switch 
                      checked={data.instantMode || true}
                      onCheckedChange={(checked) => onChange({ instantMode: checked })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Cartesia Provider Settings */}
          {data.provider === "Cartesia" && (
            <>
              <div className="pt-2 border-t border-border">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Speed</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Speech rate control (1.0 is default)</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.speed || 1.0}
                        onChange={(value) => onChange({ speed: value })}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                      />
                      <span className="text-primary font-mono w-12 text-right">{(data.speed || 1.0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="w-[60%]">
                      <Label className="text-[16px] font-semibold tracking-[0.2px] text-gray-700 dark:text-gray-200">Volume</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Volume control (1.0 is default)</p>
                    </div>
                    <div className="w-[300px] flex items-center gap-3">
                      <WizardSlider
                        value={data.volume || 1.0}
                        onChange={(value) => onChange({ volume: value })}
                        min={0.0}
                        max={2.0}
                        step={0.1}
                      />
                      <span className="text-primary font-mono w-12 text-right">{(data.volume || 1.0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[16px] font-semibold tracking-[0.2px]">Custom Voice ID (Optional)</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter a custom Cartesia Sonic 3 voice ID (UUID format) to override the selected voice</p>
                    <Input
                      placeholder="Enter custom voice ID (e.g., f9836c6e-a0bd-460e-9d3c-f7299fa60f94)"
                      value={data.customVoiceId || ""}
                      onChange={(e) => {
                        const customId = e.target.value.trim();
                        if (customId) {
                          // Update both customVoiceId and voice when custom ID is entered
                          onChange({ customVoiceId: customId, voice: customId });
                        } else {
                          onChange({ customVoiceId: "" });
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Info Box for Non-ElevenLabs */}
          {data.provider !== "ElevenLabs" && data.provider !== "Rime" && data.provider !== "Hume" && data.provider !== "Cartesia" && (
            <div className="py-3 bg-muted rounded-md px-4 flex gap-3">
              <Info className="h-[18px] w-[18px] text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enhanced voice customization features are available with ElevenLabs, Rime, Hume, and Cartesia providers.
                </p>
                <p className="text-sm text-muted-foreground">
                  Switch to ElevenLabs for advanced voice stability and clarity controls, Rime for speed optimization, Hume for emotional AI voice synthesis, or Cartesia for Sonic 3 TTS.
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