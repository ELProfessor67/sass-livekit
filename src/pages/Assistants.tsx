import { useState, useEffect } from 'react';
import DashboardLayout from "@/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { AssistantsTab } from "@/components/assistants/tabs/AssistantsTab";
import { PhoneNumbersTab } from "@/components/assistants/tabs/PhoneNumbersTab";
import { KnowledgeBaseTab } from "@/components/assistants/tabs/KnowledgeBaseTab";
import { useRouteChangeData } from "@/hooks/useRouteChange";
import { useAuth } from "@/contexts/AuthContext";

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export default function Assistants() {
  const [activeTab, setActiveTab] = useState("assistants");
  const [tabChangeTrigger, setTabChangeTrigger] = useState(0);
  const { user } = useAuth();



  // Handle tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Trigger a refresh by incrementing the trigger counter
    setTabChangeTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: "assistants", label: "Assistants" },
    { id: "phone-numbers", label: "Phone Numbers" },
    { id: "knowledge-base", label: "Knowledge Base" }
  ];

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-6xl mx-auto">
            <ThemeSection spacing="lg">
              <div className="flex flex-col space-y-[var(--space-md)]">
                <h1 className="text-[28px] font-light tracking-[0.2px] text-foreground">
                  Assistants
                </h1>
                <p className="text-muted-foreground text-sm font-medium tracking-[0.1px]">
                  Manage your AI assistants, phone numbers, and knowledge base
                </p>
              </div>

              <ThemeCard variant="glass">
                <div className="border-b border-white/[0.08]">
                  <nav className="flex gap-1 px-6">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`
                          relative px-6 py-4 text-sm font-medium transition-all duration-300
                          ${activeTab === tab.id
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground/80'
                          }
                        `}
                      >
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                            initial={false}
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      variants={tabVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                    >
                      {activeTab === "assistants" && <AssistantsTab tabChangeTrigger={tabChangeTrigger} />}
                      {activeTab === "phone-numbers" && <PhoneNumbersTab tabChangeTrigger={tabChangeTrigger} />}
                      {activeTab === "knowledge-base" && <KnowledgeBaseTab tabChangeTrigger={tabChangeTrigger} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </ThemeCard>
            </ThemeSection>
          </div>
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
}