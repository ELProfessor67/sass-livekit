import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";

interface CampaignSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CampaignSettingsData) => void;
}

interface CampaignSettingsData {
  name: string;
  agent: string;
  dailyCap: number;
  contactList: string;
  callingDays: string[];
  startHour: number;
  endHour: number;
}

const agents = [
  'Sarah Johnson',
  'Mike Chen',
  'Emily Davis',
  'Robert Taylor',
  'Lisa Anderson'
];

const contactLists = [
  'Sales Prospects',
  'Customer Support',
  'Marketing Leads',
  'Event Attendees',
  'Premium Customers'
];

const daysOfWeek = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' }
];

export function CampaignSettingsDialog({ open, onOpenChange, onSave }: CampaignSettingsDialogProps) {
  const [formData, setFormData] = useState<CampaignSettingsData>({
    name: '',
    agent: '',
    dailyCap: 100,
    contactList: '',
    callingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startHour: 9,
    endHour: 17
  });

  const handleSave = () => {
    if (!formData.name || !formData.agent || !formData.contactList) {
      return; // Basic validation
    }
    
    onSave(formData);
    
    // Reset form
    setFormData({
      name: '',
      agent: '',
      dailyCap: 100,
      contactList: '',
      callingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startHour: 9,
      endHour: 17
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleDayToggle = (dayId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        callingDays: [...prev.callingDays, dayId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        callingDays: prev.callingDays.filter(day => day !== dayId)
      }));
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-[var(--text-xl)] font-[var(--font-semibold)] text-theme-primary">
            Campaign Settings
          </DialogTitle>
          <p className="text-[var(--text-sm)] text-theme-secondary">
            Configure your campaign parameters and preferences
          </p>
        </DialogHeader>

        <div className="space-y-[var(--space-2xl)] py-[var(--space-lg)]">
          {/* Basic Information */}
          <div className="space-y-[var(--space-xl)]">
            <div className="space-y-[var(--space-md)]">
              <Label htmlFor="campaign-name" className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                Campaign Name
              </Label>
              <Input
                id="campaign-name"
                placeholder="Enter campaign name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="settings-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-[var(--space-lg)]">
              <div className="space-y-[var(--space-md)]">
                <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">Agent</Label>
                <Select
                  value={formData.agent}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, agent: value }))}
                >
                  <SelectTrigger className="settings-input">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent} value={agent}>
                        {agent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-[var(--space-md)]">
                <Label htmlFor="daily-cap" className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                  Daily Usage Cap
                </Label>
                <Input
                  id="daily-cap"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.dailyCap}
                  onChange={(e) => setFormData(prev => ({ ...prev, dailyCap: parseInt(e.target.value) || 0 }))}
                  className="settings-input"
                />
              </div>
            </div>

            <div className="space-y-[var(--space-md)]">
              <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">Contact List</Label>
              <Select
                value={formData.contactList}
                onValueChange={(value) => setFormData(prev => ({ ...prev, contactList: value }))}
              >
                <SelectTrigger className="settings-input">
                  <SelectValue placeholder="Select a contact list" />
                </SelectTrigger>
                <SelectContent>
                  {contactLists.map((list) => (
                    <SelectItem key={list} value={list}>
                      {list}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="space-y-[var(--space-xl)] pt-[var(--space-lg)] border-t border-theme-light">
            <div className="space-y-[var(--space-lg)]">
              <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                Calling Days
              </Label>
              <div className="grid grid-cols-2 gap-[var(--space-lg)]">
                {daysOfWeek.map((day) => (
                  <div key={day.id} className="flex items-center space-x-[var(--space-md)]">
                    <Checkbox
                      id={day.id}
                      checked={formData.callingDays.includes(day.id)}
                      onCheckedChange={(checked) => handleDayToggle(day.id, checked as boolean)}
                    />
                    <Label htmlFor={day.id} className="text-[var(--text-sm)] font-[var(--font-normal)] text-theme-primary cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-[var(--space-lg)]">
              <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                Local Calling Hours
              </Label>
              <div className="space-y-[var(--space-lg)]">
                <div className="px-[var(--space-lg)]">
                  <Slider
                    value={[formData.startHour, formData.endHour]}
                    onValueChange={([start, end]) => 
                      setFormData(prev => ({ ...prev, startHour: start, endHour: end }))
                    }
                    min={0}
                    max={23}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-[var(--text-sm)] text-theme-secondary">
                  <span>Start: {formatHour(formData.startHour)}</span>
                  <span>End: {formatHour(formData.endHour)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-[var(--space-lg)] border-t border-theme-light">
          <div className="flex justify-end gap-[var(--space-md)]">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.agent || !formData.contactList}
              className="px-[var(--space-xl)]"
            >
              Finish
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}