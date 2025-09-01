
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { presets } from "./presets";

interface PresetSelectorProps {
  selectedPreset: string;
  onPresetChange: (value: string) => void;
}

export function PresetSelector({ selectedPreset, onPresetChange }: PresetSelectorProps) {
  return (
    <RadioGroup className="space-y-2">
      {presets.map(preset => (
        <div key={preset.value} className="flex items-center space-x-2">
          <RadioGroupItem 
            value={preset.value} 
            id={preset.value} 
            checked={selectedPreset === preset.value} 
            onClick={() => onPresetChange(preset.value)} 
          />
          <Label htmlFor={preset.value} className="text-sm cursor-pointer">
            {preset.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
