import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, FileText, Users } from "lucide-react";

interface DeleteCsvFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  csvFileName: string;
  contactCount: number;
  campaigns?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

export function DeleteCsvFileDialog({
  open,
  onOpenChange,
  onConfirm,
  csvFileName,
  contactCount,
  campaigns = [],
  loading = false
}: DeleteCsvFileDialogProps) {
  const hasActiveCampaigns = campaigns.some(c => c.execution_status === 'running');
  const hasAnyCampaigns = campaigns.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Delete CSV File
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <FileText className="w-5 h-5 text-theme-secondary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {csvFileName}
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{contactCount} contacts</span>
                </div>
              </div>
            </div>
          </div>

          {hasAnyCampaigns && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning mb-2">
                    {hasActiveCampaigns 
                      ? 'Cannot delete CSV file - Active campaigns detected'
                      : 'Cannot delete CSV file - Used by campaigns'
                    }
                  </p>
                  <p className="text-xs text-warning/80 mb-2">
                    This CSV file is currently being used by the following campaign(s):
                  </p>
                  <ul className="text-xs text-warning/80 space-y-1">
                    {campaigns.map(campaign => (
                      <li key={campaign.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-warning rounded-full flex-shrink-0" />
                        <span className="truncate">{campaign.name}</span>
                        {campaign.execution_status === 'running' && (
                          <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                            Running
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-warning/80 mt-2">
                    {hasActiveCampaigns 
                      ? 'Please stop the running campaigns first, then delete or change the campaigns before deleting this CSV file.'
                      : 'Please delete or change the campaigns before deleting this CSV file.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasAnyCampaigns && (
            <>
              <p className="text-sm text-foreground mt-4">
                Are you sure you want to delete this CSV file?
              </p>
              
              <div className="mt-4 p-3 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">
                  This will permanently delete:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• The CSV file and all its metadata</li>
                  <li>• All {contactCount} contacts imported from this file</li>
                  <li>• Any associated contact data and history</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || hasAnyCampaigns}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete CSV File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
