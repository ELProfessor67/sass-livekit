import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupportAccessAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Example component showing the simplified auth pattern
 * Similar to voiceagents but with auto tokens and direct Supabase queries
 */
export const SimpleAuthExample = () => {
  const { user, loading, signOut } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Component-level loading state (like voiceagents)
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // Direct Supabase query with automatic token handling
      const { data: result, error } = await supabase
        .from('your_table')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      setData(result || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Please sign in to view data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simple Auth Example</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p>Welcome, {user.fullName || user.email}!</p>
            <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Data Loading Pattern:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✅ Component-level loading state</li>
              <li>✅ Direct Supabase queries (auto tokens)</li>
              <li>✅ Simple context-based auth</li>
              <li>✅ No centralized auth service</li>
            </ul>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Loading data...</div>
          ) : (
            <div>
              <p className="text-sm">Data items: {data.length}</p>
            </div>
          )}

          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
