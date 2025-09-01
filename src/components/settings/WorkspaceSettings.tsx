import { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { GeneralSettings } from "./GeneralSettings";
import { MembersSettings } from "./MembersSettings";
import { BillingSettings } from "./BillingSettings";
import { ApiIntegrations } from "./ApiIntegrations";

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export function WorkspaceSettings() {
  const [activeSubTab, setActiveSubTab] = useState("general");

  const subTabs = [
    { id: "general", label: "General" },
    { id: "members", label: "Members" },
    { id: "billing", label: "Billing" },
    { id: "integrations", label: "Integrations" }
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
          {activeSubTab === "integrations" && <ApiIntegrations />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}