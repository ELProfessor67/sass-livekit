import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { GeneralSettings } from "./GeneralSettings";
import { WorkspacesManagement } from "./workspace/WorkspacesManagement";
import { MembersSettings } from "./MembersSettings";
import { BillingSettings } from "./BillingSettings";
import BusinessUseCaseSettings from "./BusinessUseCaseSettings";
import { WhitelabelSettings } from "./WhitelabelSettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from '@/contexts/SupportAccessAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { getPlanConfigs } from '@/lib/plan-config';

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

interface WorkspaceSettingsProps {
  initialSubTab?: string | null;
}

export function WorkspaceSettings({ initialSubTab }: WorkspaceSettingsProps) {
  const { user } = useAuth();
  const { canViewMembers, canViewBilling, canManageWorkspace } = useWorkspace();
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const allowedTabs = ['general', 'workspaces', 'members', 'billing', 'business', 'whitelabel'];
    if (initialSubTab && allowedTabs.includes(initialSubTab)) {
      return initialSubTab;
    }
    return "general";
  });
  const [whitelabelAvailable, setWhitelabelAvailable] = useState(false);
  const [checkingWhitelabel, setCheckingWhitelabel] = useState(true);

  useEffect(() => {
    const determineWhitelabelAccess = async () => {
      try {
        if (!user) {
          setWhitelabelAvailable(false);
          setCheckingWhitelabel(false);
          return;
        }

        const { data: profile } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle();

        // Whitelabel check based on plan
        const planKey = (profile as any)?.plan?.toLowerCase() || 'free';
        const configs = await getPlanConfigs();
        const planConfig = configs[planKey] || configs.free;

        setWhitelabelAvailable(planConfig?.whitelabelEnabled === true);
      } catch (error) {
        console.error('Error checking whitelabel access:', error);
        setWhitelabelAvailable(false);
      } finally {
        setCheckingWhitelabel(false);
      }
    };

    determineWhitelabelAccess();
  }, [user]);

  useEffect(() => {
    if (initialSubTab === 'whitelabel' && whitelabelAvailable) {
      setActiveSubTab('whitelabel');
    }
  }, [initialSubTab, whitelabelAvailable]);

  useEffect(() => {
    if (!whitelabelAvailable && activeSubTab === 'whitelabel') {
      setActiveSubTab('general');
    }
  }, [whitelabelAvailable, activeSubTab]);

  const subTabs = useMemo(() => [
    { id: "general", label: "General" },
    ...(canManageWorkspace ? [{ id: "workspaces", label: "Workspaces" }] : []),
    ...(canViewMembers ? [{ id: "members", label: "Members" }] : []),
    ...(canViewBilling ? [{ id: "billing", label: "Billing" }] : []),
    { id: "business", label: "Business Use Case" },
    ...(whitelabelAvailable ? [{ id: "whitelabel", label: "Whitelabel" }] : [])
  ], [canViewMembers, canViewBilling, canManageWorkspace, whitelabelAvailable]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">Workspace Settings</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Manage your workspace details, team members, and subscription
        </p>
      </div>

      {/* Sub-tabs for Workspace */}
      <div className="border-b border-border/50">
        <nav className="flex gap-1">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`
                relative px-5 py-3 text-sm font-medium transition-all duration-300
                ${activeSubTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
                }
              `}
            >
              {tab.label}
              {activeSubTab === tab.id && (
                <motion.div
                  layoutId="activeSubTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-tab Content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSubTab}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === "general" && <GeneralSettings />}
          {activeSubTab === "workspaces" && <WorkspacesManagement />}
          {activeSubTab === "members" && <MembersSettings />}
          {activeSubTab === "billing" && <BillingSettings />}
          {activeSubTab === "business" && <BusinessUseCaseSettings />}
          {activeSubTab === "whitelabel" && whitelabelAvailable && <WhitelabelSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}