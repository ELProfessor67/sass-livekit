import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SupportAccessDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  onSupportAccess: (sessionData: any) => void;
  children: React.ReactNode;
}

export const SupportAccessDialog: React.FC<SupportAccessDialogProps> = ({
  userId,
  userName,
  userEmail,
  onSupportAccess,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('30');

  const handleSupportAccess = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for support access');
      return;
    }

    setLoading(true);
    try {
      // Get the current session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('No valid session found. Please log in again.');
        return;
      }

      const response = await fetch('/api/v1/support-access/support-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId: userId,
          reason: reason.trim(),
          durationMinutes: parseInt(duration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create support session');
      }

      toast.success(`Support access granted for ${userName}`);
      onSupportAccess(data);
      setOpen(false);
      setReason('');
      setDuration('30');
    } catch (error) {
      console.error('Error creating support session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create support session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Support Access
          </DialogTitle>
          <DialogDescription>
            Grant temporary access to <strong>{userName}</strong> ({userEmail}) for support purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Support Access</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Customer reported billing issue, Account setup assistance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Access Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Important:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• All actions will be logged for audit purposes</li>
                <li>• Access will automatically expire after the selected duration</li>
                <li>• You can manually end the session at any time</li>
                <li>• The user will see a banner indicating support access is active</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSupportAccess}
            disabled={loading || !reason.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating Access...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Grant Support Access
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
