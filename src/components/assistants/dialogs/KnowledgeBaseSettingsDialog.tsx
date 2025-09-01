import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  Copy, 
  BarChart3,
  Zap,
  Clock,
  HardDrive
} from 'lucide-react';
import { KnowledgeBase } from '../types/knowledgeBase';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeBaseSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase: KnowledgeBase | null;
  onSave: (updated: Partial<KnowledgeBase>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}

export const KnowledgeBaseSettingsDialog: React.FC<KnowledgeBaseSettingsDialogProps> = ({
  open,
  onOpenChange,
  knowledgeBase,
  onSave,
  onDelete,
  onDuplicate,
  onExport
}) => {
  const { toast } = useToast();
  const [name, setName] = useState(knowledgeBase?.name || '');
  const [description, setDescription] = useState(knowledgeBase?.description || '');
  const [autoSync, setAutoSync] = useState(true);
  const [allowPublicAccess, setAllowPublicAccess] = useState(false);

  React.useEffect(() => {
    if (knowledgeBase) {
      setName(knowledgeBase.name);
      setDescription(knowledgeBase.description);
    }
  }, [knowledgeBase]);

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Knowledge base name is required",
        variant: "destructive"
      });
      return;
    }

    onSave({ name: name.trim(), description: description.trim() });
    onOpenChange(false);
    toast({
      title: "Settings Updated",
      description: "Knowledge base settings have been saved successfully"
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this knowledge base? This action cannot be undone.')) {
      onDelete();
      onOpenChange(false);
      toast({
        title: "Knowledge Base Deleted",
        description: "The knowledge base has been permanently deleted",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = () => {
    onDuplicate();
    onOpenChange(false);
    toast({
      title: "Knowledge Base Duplicated",
      description: "A copy of the knowledge base has been created"
    });
  };

  const handleExport = () => {
    onExport();
    toast({
      title: "Export Started",
      description: "Your knowledge base export will begin shortly"
    });
  };

  if (!knowledgeBase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5" />
            <DialogTitle>Knowledge Base Settings</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-theme-primary">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="kb-name">Name</Label>
              <Input
                id="kb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter knowledge base name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-description">Description</Label>
              <Textarea
                id="kb-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter knowledge base description"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-theme-primary">Statistics</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 surface-elevated border-theme-light rounded-lg text-center">
                <HardDrive className="h-5 w-5 mx-auto mb-2 text-theme-secondary" />
                <p className="text-xs text-theme-secondary">Sub Knowledge Bases</p>
                <p className="text-lg font-semibold text-theme-primary">
                  {knowledgeBase.subKnowledgeBases.length}
                </p>
              </div>
              
              <div className="p-3 surface-elevated border-theme-light rounded-lg text-center">
                <BarChart3 className="h-5 w-5 mx-auto mb-2 text-theme-secondary" />
                <p className="text-xs text-theme-secondary">Total Files</p>
                <p className="text-lg font-semibold text-theme-primary">
                  {knowledgeBase.totalFiles || 0}
                </p>
              </div>
              
              <div className="p-3 surface-elevated border-theme-light rounded-lg text-center">
                <HardDrive className="h-5 w-5 mx-auto mb-2 text-theme-secondary" />
                <p className="text-xs text-theme-secondary">Total Size</p>
                <p className="text-lg font-semibold text-theme-primary">
                  {knowledgeBase.totalSize ? `${(knowledgeBase.totalSize / 1024 / 1024).toFixed(1)} MB` : '0 MB'}
                </p>
              </div>
              
              <div className="p-3 surface-elevated border-theme-light rounded-lg text-center">
                <Clock className="h-5 w-5 mx-auto mb-2 text-theme-secondary" />
                <p className="text-xs text-theme-secondary">Created</p>
                <p className="text-sm font-semibold text-theme-primary">
                  {new Date(knowledgeBase.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deployment Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-theme-primary">Deployment Status</h3>
              <Badge variant={knowledgeBase.isDeployed ? "default" : "secondary"}>
                {knowledgeBase.isDeployed ? 'Deployed' : 'Not Deployed'}
              </Badge>
            </div>
            
            {knowledgeBase.isDeployed && knowledgeBase.deployedAt && (
              <p className="text-sm text-theme-secondary">
                Last deployed: {new Date(knowledgeBase.deployedAt).toLocaleString()}
              </p>
            )}

            <Button 
              variant={knowledgeBase.isDeployed ? "outline" : "default"}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {knowledgeBase.isDeployed ? 'Redeploy Changes' : 'Deploy Knowledge Base'}
            </Button>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-theme-primary">Advanced Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-sync">Auto-sync with sources</Label>
                  <p className="text-xs text-theme-secondary">
                    Automatically update content when source websites change
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-access">Allow public access</Label>
                  <p className="text-xs text-theme-secondary">
                    Make this knowledge base accessible to other team members
                  </p>
                </div>
                <Switch
                  id="public-access"
                  checked={allowPublicAccess}
                  onCheckedChange={setAllowPublicAccess}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-theme-primary">Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Knowledge Base
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};