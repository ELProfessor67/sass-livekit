
import { Toaster } from "@/components/ui/toaster";
import TopNavigation from "@/components/navigation/TopNavigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { setUIStyle } = useTheme();
  
  // Ensure glass theme is applied when on dashboard
  useEffect(() => {
    setUIStyle("glass");
  }, [setUIStyle]);
  
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <TopNavigation />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ 
            duration: 0.4, 
            ease: [0.23, 1, 0.320, 1],
            opacity: { duration: 0.25 }
          }}
          className="flex-1 w-full"
        >
          <main className="w-full">
            {children}
          </main>
        </motion.div>
      </AnimatePresence>
      <Toaster />
    </div>
  );
}
