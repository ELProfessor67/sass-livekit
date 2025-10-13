import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Shield, Eye, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SupportSession {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  reason: string;
  duration_minutes: number;
  status: 'active' | 'expired' | 'revoked' | 'completed';
  expires_at: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
  target_user?: {
    name: string;
    contact: {
      email: string;
    };
    company: string;
  };
}

interface ActiveSupportSessionsProps {
  onSessionSelect: (session: SupportSession) => void;
}

export const ActiveSupportSessions: React.FC<ActiveSupportSessionsProps> = ({
  onSessionSelect,
}) => {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      // Get the current session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('No valid session found. Please log in again.');
        return;
      }

      const response = await fetch('/api/v1/support-access/support-sessions/active', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      toast.error('Failed to fetch active sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      // Get the current session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('No valid session found. Please log in again.');
        return;
      }

      const response = await fetch(`/api/v1/support-access/support-sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: 'revoked' }),
      });

      if (!response.ok) {
        throw new Error('Failed to end support session');
      }

      toast.success('Support session ended');
      fetchActiveSessions(); // Refresh the list
    } catch (error) {
      console.error('Error ending support session:', error);
      toast.error('Failed to end support session');
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiryTime = new Date(expiresAt).getTime();
    const remaining = Math.max(0, expiryTime - now);

    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return { minutes, seconds, total: remaining };
  };

  const getStatusBadge = (session: SupportSession) => {
    const timeRemaining = getTimeRemaining(session.expires_at);
    
    if (timeRemaining.total === 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (timeRemaining.total < 5 * 60 * 1000) { // Less than 5 minutes
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expiring Soon
        </Badge>
      );
    }
    
    return <Badge variant="default" className="bg-green-600">Active</Badge>;
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Support Sessions
          </CardTitle>
          <CardDescription>
            Currently active support access sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading active sessions...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Support Sessions
          </CardTitle>
          <CardDescription>
            Currently active support access sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No active support sessions</p>
            <p className="text-sm">Support access sessions will appear here when created</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Active Support Sessions ({sessions.length})
        </CardTitle>
        <CardDescription>
          Currently active support access sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time Remaining</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const timeRemaining = getTimeRemaining(session.expires_at);
              const targetUser = session.target_user;
              
              return (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {targetUser?.name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {targetUser?.contact?.email || 'No email'}
                      </div>
                      {targetUser?.company && (
                        <div className="text-xs text-gray-400">
                          {targetUser.company}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={session.reason}>
                      {session.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(session)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-mono">
                        {formatTime(timeRemaining.minutes, timeRemaining.seconds)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(session.started_at).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSessionSelect(session)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEndSession(session.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4 mr-1" />
                        End
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
