
import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats";
import CallAnalytics from "./CallAnalytics";
import CallTimeHeatmap from "./CallTimeHeatmap";
import CallOutcomes from "./CallOutcomes";
import RecentCalls from "@/components/dashboard/recent-calls/RecentCalls";
import { ThemeContainer, ThemeSection } from "@/components/theme";

interface DashboardContentProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  callLogs: any[];
  isLoading: boolean;
  stats: {
    totalCalls: number;
    avgDuration: number;
    appointments: number;
    bookingRate: number;
    successfulTransfers: number;
  };
  callOutcomesData: Record<string, number>;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0
  },
};

export default function DashboardContent({ 
  dateRange, 
  callLogs, 
  isLoading,
  stats,
  callOutcomesData
}: DashboardContentProps) {
  return (
    <ThemeContainer variant="base" className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-[var(--space-2xl)] py-[var(--space-4xl)]">
        <ThemeSection spacing="xl">
          <motion.section variants={container} initial="hidden" animate="show">
            <motion.div variants={item}>
              <DashboardHeader dateRange={dateRange} />
            </motion.div>
            
            <motion.div variants={item} className="mt-[var(--space-3xl)]">
              <DashboardStats {...stats} />
            </motion.div>
          </motion.section>

          <motion.section
            variants={item}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <CallAnalytics dateRange={dateRange} callLogs={callLogs} />
          </motion.section>

          <motion.section 
            className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-3xl)]"
            variants={item}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <CallTimeHeatmap callLogs={callLogs} />
            <CallOutcomes callOutcomes={callOutcomesData} isLoading={isLoading} />
          </motion.section>

          <motion.section
            variants={item}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <RecentCalls callLogs={callLogs} isLoading={isLoading} />
          </motion.section>
        </ThemeSection>
      </div>
    </ThemeContainer>
  );
}
