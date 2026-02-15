
import { format, parseISO, isSameDay, isYesterday } from "date-fns";

/**
 * Parse a timestamp (ISO string or Date) into a Date object.
 * Ensures UTC ISO strings (with Z) are parsed correctly for users in any timezone.
 */
export function parseTimestamp(input: string | Date): Date {
  if (input instanceof Date) return input;
  if (!input) return new Date(NaN);
  return parseISO(input);
}

/**
 * Format a date for conversation list display - always in the user's local timezone.
 * Shows: "2:34 AM" for today, "Yesterday" for yesterday, "Feb 4" for other dates.
 */
export function formatConversationDate(timestamp: Date | string): string {
  const date = parseTimestamp(timestamp);
  if (isNaN(date.getTime())) return "Invalid date";
  const now = new Date();
  if (isSameDay(date, now)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "MMM d");
}

/**
 * Format a date for message thread date separators - always in user's local timezone.
 * Shows: "TODAY", "Yesterday", or "MMM d, yyyy".
 */
export function formatMessageDateSeparator(timestamp: Date | string): string {
  const date = parseTimestamp(timestamp);
  if (isNaN(date.getTime())) return "Invalid date";
  const now = new Date();
  if (isSameDay(date, now)) return "TODAY";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

/**
 * Format time only in user's local timezone (e.g., "2:34 AM").
 */
export function formatConversationTime(timestamp: Date | string): string {
  const date = parseTimestamp(timestamp);
  if (isNaN(date.getTime())) return "Invalid time";
  return format(date, "h:mm a");
}

export const formatPhoneNumber = (phone?: string): string => {
  // Handle undefined, null or empty phone numbers
  if (!phone) return 'Unknown';

  // Remove any non-digit characters except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with +, return as international format
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If it's 10 digits, format as US number
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }

  // For other lengths, return as is
  return phone;
};

export interface FormattedDateTime {
  date: string;
  time: string;
}

export const formatDateTime = (dateTimeStr: string): FormattedDateTime => {
  try {
    const dateObj = parseISO(dateTimeStr);
    return {
      date: format(dateObj, 'MMM d, yyyy'),
      time: format(dateObj, 'h:mm a')
    };
  } catch (e) {
    return { date: 'Invalid date', time: 'Invalid time' };
  }
};

export const formatCallDuration = (duration: string): string => {
  // Check if duration is already in MM:SS format
  if (duration.includes(':')) {
    return duration;
  }

  // Handle 's' suffix for seconds format (e.g. "45s")
  const seconds = parseInt(duration.replace(/[^0-9]/g, ''));

  if (isNaN(seconds)) return '00:00';

  // Format as MM:SS
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getCustomerName = (call: any): string => {
  const analysis = call.analysis || call.structured_data;

  // Try to get name from analysis first as it's often more accurate for "Unknown" callers
  if (analysis) {
    const customerNameField = analysis['Customer Name'] || analysis['name'] || analysis['fullName'] || analysis['booking_name'];

    if (customerNameField) {
      if (typeof customerNameField === 'string' && customerNameField.trim() !== '' && customerNameField !== 'Unknown') {
        return customerNameField;
      } else if (typeof customerNameField === 'object' && customerNameField.value && customerNameField.value !== 'Unknown') {
        return customerNameField.value;
      }
    }
  }

  // Check explicit first/last name columns
  const firstName = call.first_name || '';
  const lastName = call.last_name || '';
  if ((firstName && firstName !== 'NA' && firstName !== 'Unknown' && !firstName.startsWith('+')) ||
    (lastName && lastName !== 'NA' && lastName !== 'Unknown' && !lastName.startsWith('+'))) {
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  // Check display name - but skip if it looks like a phone number
  const isPhoneNumber = (val: string) => /^\+?[\d\s-()]+$/.test(val);
  if (call.name && call.name !== 'Unknown' && !isPhoneNumber(call.name)) {
    return call.name;
  }

  // Check contact_name
  if (call.contact_name && call.contact_name !== 'Unknown') {
    return call.contact_name;
  }

  // If we only have a phone number, return it formatted or 'Unknown'
  const number = call.phoneNumber || call.phone_number || call.participant_identity;
  if (number && number !== 'Unknown') {
    return number;
  }

  return 'Unknown';
};
