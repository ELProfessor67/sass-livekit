import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Shield, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SupportAccessBannerProps {
  session: {
    id: string;
    target_user_id: string;
    reason: string;
    expires_at: string;
    admin_user_id: string;
  };
  targetUser: {
    name: string;
    email: string;
    company?: string;
  };
  onEndSession: () => void;
  onExitImpersonation: () => void;
}

export const SupportAccessBanner: React.FC<SupportAccessBannerProps> = ({
  session,
  targetUser,
  onEndSession,
  onExitImpersonation,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    minutes: number;
    seconds: number;
    total: number;
  }>({ minutes: 0, seconds: 0, total: 0 });
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(session.expires_at).getTime();
      const remaining = Math.max(0, expiryTime - now);

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining({ minutes, seconds, total: remaining });

      // Check if expiring soon (less than 5 minutes)
      setIsExpiringSoon(remaining < 5 * 60 * 1000);

      // Auto-end session when expired
      if (remaining === 0) {
        toast.warning('Support access session has expired');
        onEndSession();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session.expires_at, onEndSession]);

  const handleEndSession = async () => {
    try {
      // Get the current session token from Supabase
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast.error('No valid session found. Please log in again.');
        return;
      }

      const response = await fetch(`/api/v1/support-access/support-sessions/${session.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ reason: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to end support session');
      }

      toast.success('Support access session ended');
      onEndSession();
    } catch (error) {
      console.error('Error ending support session:', error);
      toast.error('Failed to end support session');
    }
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining.total === 0) return 'text-red-600';
    if (isExpiringSoon) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Alert className={`border-l-4 ${isExpiringSoon ? 'border-amber-500 bg-amber-50' : 'border-blue-500 bg-blue-50'} mb-4`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Shield className={`h-5 w-5 ${isExpiringSoon ? 'text-amber-600' : 'text-blue-600'}`} />
          <div>
            <AlertDescription className="font-medium text-gray-900">
              Support Access Active
            </AlertDescription>
            <div className="text-sm text-gray-600 mt-1">
              Viewing as <strong>{targetUser.name}</strong> ({targetUser.email})
              {targetUser.company && (
                <span> • {targetUser.company}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Reason: {session.reason}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-lg font-mono font-bold ${getTimeColor()}`}>
              {formatTime(timeRemaining.minutes, timeRemaining.seconds)}
            </div>
            <div className="text-xs text-gray-500">
              {timeRemaining.total === 0 ? 'Expired' : 'Time remaining'}
            </div>
          </div>

          {isExpiringSoon && timeRemaining.total > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Expiring Soon
            </Badge>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndSession}
              className="text-gray-600 hover:text-gray-800"
            >
              <Clock className="h-4 w-4 mr-1" />
              End Session
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExitImpersonation}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Exit
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
};
