
import { format, parseISO } from "date-fns";

export const formatPhoneNumber = (phone?: string): string => {
  // Handle undefined, null or empty phone numbers
  if (!phone) return 'Unknown';
  
  // Remove any non-digit characters and +1 prefix
  const cleaned = phone.replace(/\D/g, '').replace(/^1/, '');
  
  // Ensure we have 10 digits
  if (cleaned.length !== 10) return phone;
  
  // Format as (XXX) XXX-XXXX
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
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
  const firstName = call.first_name || '';
  const lastName = call.last_name || '';
  if ((firstName && firstName !== 'NA') || (lastName && lastName !== 'NA')) {
    return [firstName, lastName].filter(Boolean).join(" ");
  }
  if (call.contact_name) {
    return call.contact_name;
  }
  return 'Unknown';
};
