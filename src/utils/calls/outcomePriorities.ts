
import { OutcomePriorityMap } from "./types";

// Define outcome priorities (higher number = higher priority)
// Use the same priorities as in call-outcomes/utils.tsx for consistency
export const outcomePriorities: OutcomePriorityMap = {
  'booked appointment': 5,
  'appointment': 5,
  'not qualified': 4,
  'not eligible': 4,
  'spam': 3,
  'escalated': 2,
  'message to franchisee': 2,
  'call dropped': 1,
  'unknown': 0
};
