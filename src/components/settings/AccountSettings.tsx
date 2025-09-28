
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ProfileForm } from "./account/ProfileForm";
import { NotificationsForm } from "./account/NotificationsForm";
import { UIPreferencesSettings } from "./UIPreferencesSettings";

interface AccountSettingsProps {
  initialSubTab?: string | null;
}

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export function AccountSettings({ initialSubTab }: AccountSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState("profile");

  useEffect(() => {
    if (initialSubTab && ['profile', 'notifications', 'preferences'].includes(initialSubTab)) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const subTabs = [
    { id: "profile", label: "Profile" },
    { id: "notifications", label: "Notifications" },
    { id: "preferences", label: "Preferences" }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">Account Settings</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Manage your personal information and interface preferences
        </p>
      </div>

      {/* Sub-tabs for Account */}
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
                  layoutId="activeAccountSubTab"
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
          {activeSubTab === "profile" && <ProfileForm />}
          {activeSubTab === "notifications" && <NotificationsForm />}
          {activeSubTab === "preferences" && <UIPreferencesSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
