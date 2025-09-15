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
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  campaignName: string;
  isRunning?: boolean;
  loading?: boolean;
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  campaignName,
  isRunning = false,
  loading = false
}: DeleteCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Delete Campaign
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete the campaign{' '}
            <span className="font-medium text-foreground">"{campaignName}"</span>?
          </p>
          
          {isRunning && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-md">
              <p className="text-sm text-warning">
                <strong>Warning:</strong> This campaign is currently running. 
                Please stop the campaign first before deleting it.
              </p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              This will permanently delete the campaign and all associated data including:
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
              <li>• Campaign settings and configuration</li>
              <li>• Call history and recordings</li>
              <li>• Contact interactions and outcomes</li>
              <li>• All campaign statistics</li>
            </ul>
          </div>
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
            disabled={loading || isRunning}
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
                Delete Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
