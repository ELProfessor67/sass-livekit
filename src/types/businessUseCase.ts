export type BusinessUseCase = "appointment-setting" | "customer-service" | "recruitment" | "ecommerce" | "general";

export interface MetricConfig {
  key: string;
  label: string;
  icon: string;
  format: "number" | "duration" | "percentage" | "currency";
  description?: string;
}

export interface OutcomeConfig {
  key: string;
  label: string;
  color: string;
  icon: string;
  priority: number;
}

export interface BusinessUseCaseConfig {
  id: BusinessUseCase;
  name: string;
  description: string;
  primaryColor: string;
  metrics: MetricConfig[];
  outcomes: OutcomeConfig[];
  chartTitles: {
    callVolume: string;
    callOutcomes: string;
    timeHeatmap: string;
  };
  terminology: {
    calls: string;
    success: string;
    duration: string;
  };
}

export const BUSINESS_USE_CASE_TEMPLATES: Record<BusinessUseCase, BusinessUseCaseConfig> = {
  "appointment-setting": {
    id: "appointment-setting",
    name: "Appointment Setting",
    description: "Optimize for booking appointments and scheduling consultations",
    primaryColor: "hsl(142 76% 36%)",
    metrics: [
      { key: "totalCalls", label: "Total Calls", icon: "Phone", format: "number" },
      { key: "avgDuration", label: "Avg. Call Duration", icon: "Timer", format: "duration" },
      { key: "appointments", label: "Appointments", icon: "Calendar", format: "number" },
      { key: "bookingRate", label: "Booking Rate", icon: "ChartLineUp", format: "percentage" },
      { key: "successfulTransfers", label: "Successful Transfers", icon: "ArrowRight", format: "number" }
    ],
    outcomes: [
      { key: "booked appointment", label: "Booked Appointment", color: "hsl(142 76% 36%)", icon: "Calendar", priority: 1 },
      { key: "not qualified", label: "Not Qualified", color: "hsl(45 93% 47%)", icon: "AlertCircle", priority: 3 },
      { key: "spam", label: "Spam", color: "hsl(0 72% 51%)", icon: "AlertCircle", priority: 5 },
      { key: "escalated", label: "Escalated", color: "hsl(217 91% 60%)", icon: "MessageSquare", priority: 4 },
      { key: "call dropped", label: "Call Dropped", color: "hsl(215 28% 17%)", icon: "PhoneOff", priority: 6 }
    ],
    chartTitles: {
      callVolume: "Call Volume",
      callOutcomes: "Call Outcomes",
      timeHeatmap: "Call Time Distribution"
    },
    terminology: {
      calls: "calls",
      success: "appointments booked",
      duration: "talk time"
    }
  },
  "customer-service": {
    id: "customer-service",
    name: "Customer Service",
    description: "Focus on resolution rates and customer satisfaction",
    primaryColor: "hsl(217 91% 60%)",
    metrics: [
      { key: "totalCalls", label: "Total Tickets", icon: "Phone", format: "number" },
      { key: "avgDuration", label: "Avg. Resolution Time", icon: "Timer", format: "duration" },
      { key: "resolved", label: "Resolved", icon: "CheckCircle", format: "number" },
      { key: "resolutionRate", label: "Resolution Rate", icon: "ChartLineUp", format: "percentage" }
    ],
    outcomes: [
      { key: "resolved", label: "Resolved", color: "hsl(142 76% 36%)", icon: "CheckCircle", priority: 1 },
      { key: "escalated", label: "Escalated", color: "hsl(45 93% 47%)", icon: "ArrowUp", priority: 2 },
      { key: "pending", label: "Pending", color: "hsl(217 91% 60%)", icon: "Clock", priority: 3 },
      { key: "spam", label: "Spam", color: "hsl(0 72% 51%)", icon: "AlertCircle", priority: 5 },
      { key: "call dropped", label: "Call Dropped", color: "hsl(215 28% 17%)", icon: "PhoneOff", priority: 4 }
    ],
    chartTitles: {
      callVolume: "Ticket Volume",
      callOutcomes: "Resolution Status",
      timeHeatmap: "Support Request Distribution"
    },
    terminology: {
      calls: "tickets",
      success: "issues resolved",
      duration: "resolution time"
    }
  },
  "recruitment": {
    id: "recruitment",
    name: "Recruitment",
    description: "Track candidate screening and interview scheduling",
    primaryColor: "hsl(280 100% 70%)",
    metrics: [
      { key: "totalCalls", label: "Candidate Calls", icon: "Phone", format: "number" },
      { key: "avgDuration", label: "Avg. Screen Time", icon: "Timer", format: "duration" },
      { key: "interviews", label: "Interviews Scheduled", icon: "Calendar", format: "number" },
      { key: "conversionRate", label: "Screen-to-Interview Rate", icon: "ChartLineUp", format: "percentage" }
    ],
    outcomes: [
      { key: "interview scheduled", label: "Interview Scheduled", color: "hsl(142 76% 36%)", icon: "Calendar", priority: 1 },
      { key: "qualified", label: "Qualified", color: "hsl(280 100% 70%)", icon: "UserCheck", priority: 2 },
      { key: "not qualified", label: "Not Qualified", color: "hsl(45 93% 47%)", icon: "UserX", priority: 3 },
      { key: "no show", label: "No Show", color: "hsl(0 72% 51%)", icon: "UserMinus", priority: 4 },
      { key: "call dropped", label: "Call Dropped", color: "hsl(215 28% 17%)", icon: "PhoneOff", priority: 5 }
    ],
    chartTitles: {
      callVolume: "Candidate Call Volume",
      callOutcomes: "Screening Results",
      timeHeatmap: "Candidate Call Distribution"
    },
    terminology: {
      calls: "candidate calls",
      success: "interviews scheduled",
      duration: "screening time"
    }
  },
  "ecommerce": {
    id: "ecommerce",
    name: "E-commerce",
    description: "Optimize for sales conversions and order processing",
    primaryColor: "hsl(24 100% 50%)",
    metrics: [
      { key: "totalCalls", label: "Customer Calls", icon: "Phone", format: "number" },
      { key: "avgDuration", label: "Avg. Call Time", icon: "Timer", format: "duration" },
      { key: "orders", label: "Orders Placed", icon: "ShoppingCart", format: "number" },
      { key: "conversionRate", label: "Conversion Rate", icon: "ChartLineUp", format: "percentage" }
    ],
    outcomes: [
      { key: "order placed", label: "Order Placed", color: "hsl(142 76% 36%)", icon: "ShoppingCart", priority: 1 },
      { key: "quote requested", label: "Quote Requested", color: "hsl(24 100% 50%)", icon: "FileText", priority: 2 },
      { key: "inquiry", label: "General Inquiry", color: "hsl(217 91% 60%)", icon: "MessageCircle", priority: 3 },
      { key: "complaint", label: "Complaint", color: "hsl(0 72% 51%)", icon: "AlertTriangle", priority: 4 },
      { key: "call dropped", label: "Call Dropped", color: "hsl(215 28% 17%)", icon: "PhoneOff", priority: 5 }
    ],
    chartTitles: {
      callVolume: "Customer Call Volume",
      callOutcomes: "Call Results",
      timeHeatmap: "Customer Contact Distribution"
    },
    terminology: {
      calls: "customer calls",
      success: "sales completed",
      duration: "call time"
    }
  },
  "general": {
    id: "general",
    name: "General Business",
    description: "Flexible metrics for various business needs",
    primaryColor: "hsl(217 91% 60%)",
    metrics: [
      { key: "totalCalls", label: "Total Calls", icon: "Phone", format: "number" },
      { key: "avgDuration", label: "Avg. Call Duration", icon: "Timer", format: "duration" },
      { key: "appointments", label: "Appointments", icon: "Calendar", format: "number" },
      { key: "bookingRate", label: "Booking Rate", icon: "ChartLineUp", format: "percentage" },
      { key: "successfulTransfers", label: "Successful Transfers", icon: "ArrowRight", format: "number" }
    ],
    outcomes: [
      { key: "successful", label: "Successful", color: "hsl(142 76% 36%)", icon: "CheckCircle", priority: 1 },
      { key: "follow-up", label: "Follow-up Required", color: "hsl(45 93% 47%)", icon: "Clock", priority: 2 },
      { key: "escalated", label: "Escalated", color: "hsl(217 91% 60%)", icon: "ArrowUp", priority: 3 },
      { key: "unsuccessful", label: "Unsuccessful", color: "hsl(0 72% 51%)", icon: "XCircle", priority: 4 },
      { key: "call dropped", label: "Call Dropped", color: "hsl(215 28% 17%)", icon: "PhoneOff", priority: 5 }
    ],
    chartTitles: {
      callVolume: "Call Volume",
      callOutcomes: "Call Outcomes",
      timeHeatmap: "Call Distribution"
    },
    terminology: {
      calls: "calls",
      success: "successful calls",
      duration: "call duration"
    }
  }
};