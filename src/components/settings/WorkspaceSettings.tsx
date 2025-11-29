import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { GeneralSettings } from "./GeneralSettings";
import { MembersSettings } from "./MembersSettings";
import { BillingSettings } from "./BillingSettings";
import BusinessUseCaseSettings from "./BusinessUseCaseSettings";
import WhitelabelSettings from "./WhitelabelSettings";
import { useAuth } from '@/contexts/SupportAccessAuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const allowedTabs = ['general', 'members', 'billing', 'business', 'whitelabel'];
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
          .select('plan, tenant, role, slug_name')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[Whitelabel Check] User profile:', profile);

        // Check if user is a whitelabel admin (admin role with slug_name)
        const isWhitelabelAdmin = profile?.role === 'admin' && profile?.slug_name != null;
        console.log('[Whitelabel Check] Is whitelabel admin?', isWhitelabelAdmin);

        // If user is a whitelabel admin, grant access
        if (isWhitelabelAdmin) {
          setWhitelabelAvailable(true);
          setCheckingWhitelabel(false);
          return;
        }

        const planKey = profile?.plan?.toLowerCase() || 'free';
        const tenantFilter = profile?.tenant && profile.tenant !== 'main' ? profile.tenant : null;

        console.log('[Whitelabel Check] Plan key:', planKey, 'Tenant filter:', tenantFilter);

        const configs = await getPlanConfigs(tenantFilter ?? undefined);
        console.log('[Whitelabel Check] All plan configs:', configs);

        const planConfig = configs[planKey] || configs.free;
        console.log('[Whitelabel Check] User plan config:', planConfig);
        console.log('[Whitelabel Check] Whitelabel enabled?', planConfig?.whitelabelEnabled);

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

  const subTabs = [
    { id: "general", label: "General" },
    { id: "members", label: "Members" },
    { id: "billing", label: "Billing" },
    { id: "business", label: "Business Use Case" },
    ...(whitelabelAvailable ? [{ id: "whitelabel", label: "Whitelabel" }] : [])
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">Workspace Settings</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Manage billing, integrations, and workspace-wide settings
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
                relative px-4 py-3 text-sm font-medium transition-all duration-300
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
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === "general" && <GeneralSettings />}
          {activeSubTab === "members" && <MembersSettings />}
          {activeSubTab === "billing" && <BillingSettings />}
          {activeSubTab === "business" && <BusinessUseCaseSettings />}
          {activeSubTab === "whitelabel" && whitelabelAvailable && <WhitelabelSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}