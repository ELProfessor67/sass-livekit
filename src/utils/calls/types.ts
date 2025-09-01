
import { Call } from "@/components/calls/types";

export interface SortingOptions {
  prioritizeAppointments?: boolean;
  maxItemsForDiversity?: number;
}

export type OutcomePriorityMap = Record<string, number>;
