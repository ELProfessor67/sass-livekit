
import React from 'react';
import { AlertCircle } from "lucide-react";
import { outcomeMapping } from "./OutcomeMapping";
import { OutcomeBadge } from "@/components/ui/outcome-badge";

// Define outcome priorities (higher number = higher priority)
const outcomePriorities: Record<string, number> = {
  'booked appointment': 5,
  'appointment': 5,
  'not qualified': 4,
  'not eligible': 4,
  'spam': 3,
  'escalated': 2,
  'message to franchisee': 2,
  'call dropped': 1
};

// Function to normalize resolution strings - exported so it can be used in other components
export const normalizeResolution = (resolution: string | undefined | null): string => {
  if (!resolution) return '';
  resolution = resolution.toLowerCase().trim();
  
  // Check for exact matches first to avoid incorrect normalization
  if (resolution === 'appointment' || resolution === 'booked appointment') {
    return 'booked appointment';
  }
  
  if (resolution === 'not qualified' || resolution === 'not eligible') {
    return 'not qualified';
  }
  
  if (resolution === 'escalated' || resolution === 'message to franchisee') {
    return 'message to franchisee';
  }
  
  if (resolution === 'spam') {
    return 'spam';
  }
  
  if (resolution === 'call dropped') {
    return 'call dropped';
  }
  
  // Fallback to partial matching only if no exact match is found
  if (resolution.includes('appointment')) return 'booked appointment';
  if (resolution.includes('eligible') || resolution.includes('qualified')) return 'not qualified';
  if (resolution.includes('franchisee')) return 'message to franchisee';
  if (resolution.includes('escalated')) return 'escalated';
  if (resolution.includes('spam')) return 'spam';
  if (resolution.includes('dropped')) return 'call dropped';
  
  return resolution;
};

export const prepareChartData = (callOutcomes: Record<string, number>, dynamicMapping?: Record<string, any>) => {
  const mapping = dynamicMapping || outcomeMapping;
  const total = Object.values(callOutcomes).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  // Normalize and combine outcomes with the same meaning
  const normalizedOutcomes: Record<string, number> = {};
  Object.entries(callOutcomes).forEach(([outcome, count]) => {
    const normalizedKey = normalizeResolution(outcome);
    normalizedOutcomes[normalizedKey] = (normalizedOutcomes[normalizedKey] || 0) + count;
  });

  // Convert to array and calculate percentages
  const chartData = Object.entries(normalizedOutcomes).map(([outcome, count]) => {
    const outcomeKey = outcome.toLowerCase();
    const mappedOutcome = mapping[outcomeKey] || mapping[outcome.toLowerCase()] || {
      name: outcome.charAt(0).toUpperCase() + outcome.slice(1),
      color: "#64748b",
      icon: <AlertCircle size={16} className="text-white" />
    };
    
    return {
      name: mappedOutcome.name,
      value: Math.round((count / total) * 100),
      color: mappedOutcome.color,
      icon: mappedOutcome.icon,
      originalOutcome: outcome,
      priority: outcomePriorities[outcomeKey] || 0
    };
  }).filter(item => item.value > 0);

  // Sort by priority (highest to lowest)
  chartData.sort((a, b) => b.priority - a.priority);

  return chartData;
};

// Function to get the outcome badge with proper styling
export const getOutcomeBadge = (outcome?: string | null) => {
  if (!outcome) return null;
  
  const normalizedOutcome = normalizeResolution(outcome);
  const mappedOutcome = outcomeMapping[normalizedOutcome] || 
                        outcomeMapping['completed']; // Fallback to completed
  
  if (!mappedOutcome) {
    return null;
  }
  
  return (
    <OutcomeBadge 
      outcome={mappedOutcome.name}
      icon={mappedOutcome.icon}
      color={mappedOutcome.color}
    />
  );
};
