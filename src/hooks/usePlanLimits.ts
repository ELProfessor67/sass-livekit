import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupportAccessAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPlanConfigs } from '@/lib/plan-config';

export interface PlanLimits {
  maxAssistants: number | null;  // null = unlimited
  workspacesEnabled: boolean;
  maxWorkspaces: number | null;  // null = unlimited
  loading: boolean;
}

export function usePlanLimits(): PlanLimits {
  const { user } = useAuth();
  const [limits, setLimits] = useState<PlanLimits>({
    maxAssistants: null,
    workspacesEnabled: true,
    maxWorkspaces: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setLimits({ maxAssistants: null, workspacesEnabled: true, maxWorkspaces: null, loading: false });
      return;
    }

    const fetchLimits = async () => {
      try {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle();

        const planKey = profile?.plan?.toLowerCase() || 'free';
        const configs = await getPlanConfigs();
        const planConfig = configs[planKey] || configs.free;

        setLimits({
          maxAssistants: planConfig?.maxAssistants ?? null,
          workspacesEnabled: planConfig?.workspacesEnabled ?? true,
          maxWorkspaces: planConfig?.maxWorkspaces ?? null,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching plan limits:', error);
        setLimits({ maxAssistants: null, workspacesEnabled: true, maxWorkspaces: null, loading: false });
      }
    };

    fetchLimits();
  }, [user?.id]);

  return limits;
}
