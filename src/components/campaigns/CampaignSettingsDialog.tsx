import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { fetchAssistants, Assistant } from "@/lib/api/assistants/fetchAssistants";
import { fetchContactLists, ContactList } from "@/lib/api/contacts/fetchContactLists";
import { fetchCsvFiles, CsvFile } from "@/lib/api/csv/fetchCsvFiles";
import { useAuth } from "@/contexts/SupportAccessAuthContext";

interface CampaignSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CampaignSettingsData) => void;
}

interface CampaignSettingsData {
  name: string;
  assistantId: string;
  contactSource: 'contact_list' | 'csv_file';
  contactListId?: string;
  csvFileId?: string;
  dailyCap: number;
  callingDays: string[];
  startHour: number;
  endHour: number;
  campaignPrompt: string;
}

// Mock data removed - will fetch from database

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
  const { user } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [csvFiles, setCsvFiles] = useState<CsvFile[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CampaignSettingsData>({
    name: '',
    assistantId: '',
    contactSource: 'contact_list',
    contactListId: '',
    csvFileId: '',
    dailyCap: 100,
    callingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startHour: 9,
    endHour: 17,
    campaignPrompt: ''
  });

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [assistantsRes, contactListsRes, csvFilesRes] = await Promise.all([
            fetchAssistants(),
            fetchContactLists(),
            fetchCsvFiles()
          ]);
          
          setAssistants(assistantsRes.assistants);
          setContactLists(contactListsRes.contactLists);
          setCsvFiles(csvFilesRes.csvFiles);
        } catch (error) {
          console.error('Error fetching campaign data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [open, user?.id]);

  const handleSave = () => {
    if (!formData.name || !formData.assistantId || 
        (formData.contactSource === 'contact_list' && !formData.contactListId) ||
        (formData.contactSource === 'csv_file' && !formData.csvFileId)) {
      return; // Basic validation
    }
    
    onSave(formData);
    
    // Reset form
    setFormData({
      name: '',
      assistantId: '',
      contactSource: 'contact_list',
      contactListId: '',
      csvFileId: '',
      dailyCap: 100,
      callingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startHour: 9,
      endHour: 17,
      campaignPrompt: ''
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
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3 flex-shrink-0">
          <DialogTitle className="text-[var(--text-xl)] font-[var(--font-semibold)] text-theme-primary">
            Campaign Settings
          </DialogTitle>
          <p className="text-[var(--text-sm)] text-theme-secondary">
            Configure your campaign parameters and preferences
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-[var(--space-2xl)] py-[var(--space-lg)]">
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
                <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">Assistant</Label>
                <Select
                  value={formData.assistantId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assistantId: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="settings-input">
                    <SelectValue placeholder={loading ? "Loading assistants..." : "Select an assistant"} />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name}
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
              <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">Contact Source</Label>
              <Select
                value={formData.contactSource}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  contactSource: value as 'contact_list' | 'csv_file',
                  contactListId: '',
                  csvFileId: ''
                }))}
              >
                <SelectTrigger className="settings-input">
                  <SelectValue placeholder="Select contact source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact_list">Contact Lists</SelectItem>
                  <SelectItem value="csv_file">CSV Files</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.contactSource === 'contact_list' && (
              <div className="space-y-[var(--space-md)]">
                <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">Contact List</Label>
                <Select
                  value={formData.contactListId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contactListId: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="settings-input">
                    <SelectValue placeholder={loading ? "Loading contact lists..." : "Select a contact list"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contactLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.count} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.contactSource === 'csv_file' && (
              <div className="space-y-[var(--space-md)]">
                <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">CSV File</Label>
                <Select
                  value={formData.csvFileId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, csvFileId: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="settings-input">
                    <SelectValue placeholder={loading ? "Loading CSV files..." : "Select a CSV file"} />
                  </SelectTrigger>
                  <SelectContent>
                    {csvFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.name} ({file.row_count} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Campaign Prompt */}
          <div className="space-y-[var(--space-xl)] pt-[var(--space-lg)] border-t border-theme-light">
            <div className="space-y-[var(--space-lg)]">
              <div className="space-y-[var(--space-md)]">
                <Label htmlFor="campaign-prompt" className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                  Campaign Prompt
                </Label>
                <Textarea
                  id="campaign-prompt"
                  placeholder="Enter the script for your AI agent to follow during calls. Use placeholders like {name}, {email}, {phone} for personalization."
                  value={formData.campaignPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, campaignPrompt: e.target.value }))}
                  className="settings-input min-h-[120px]"
                />
                <div className="text-[var(--text-xs)] text-theme-secondary">
                  <p className="mb-1">Available placeholders:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="px-2 py-1 bg-theme-light rounded text-[var(--text-xs)]">{'{name}'}</code>
                    <code className="px-2 py-1 bg-theme-light rounded text-[var(--text-xs)]">{'{email}'}</code>
                    <code className="px-2 py-1 bg-theme-light rounded text-[var(--text-xs)]">{'{phone}'}</code>
                  </div>
                </div>
              </div>

              {/* Prompt Preview */}
              {formData.campaignPrompt && (
                <div className="space-y-[var(--space-md)]">
                  <Label className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                    Preview (with sample data)
                  </Label>
                  <div className="p-[var(--space-lg)] bg-theme-light rounded-lg border border-theme-border">
                    <div className="text-[var(--text-sm)] text-theme-secondary whitespace-pre-wrap">
                      {formData.campaignPrompt
                        .replace(/{name}/g, 'John Smith')
                        .replace(/{email}/g, 'john@example.com')
                        .replace(/{phone}/g, '+1 (555) 123-4567')
                      }
                    </div>
                  </div>
                </div>
              )}
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
                    value={[formData.startHour, formData.endHour === 0 ? 24 : formData.endHour]}
                    onValueChange={([start, end]) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        startHour: start, 
                        endHour: end === 24 ? 0 : end 
                      }))
                    }
                    min={0}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-[var(--text-sm)] text-theme-secondary">
                  <span>Start: {formatHour(formData.startHour)}</span>
                  <span>End: {(formData.startHour === 0 && formData.endHour === 0) ? '24/7' : formatHour(formData.endHour)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-[var(--space-lg)] border-t border-theme-light">
          <div className="flex justify-end gap-[var(--space-md)]">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.assistantId || 
                       (formData.contactSource === 'contact_list' && !formData.contactListId) ||
                       (formData.contactSource === 'csv_file' && !formData.csvFileId)}
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