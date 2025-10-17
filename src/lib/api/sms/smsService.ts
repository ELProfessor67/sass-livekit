import { getActiveTwilioCredentials } from '@/lib/twilio-credentials';

export interface SMSMessage {
  messageSid: string;
  to: string;
  from: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  dateCreated: string;
  dateSent?: string;
  dateUpdated: string;
  errorCode?: string;
  errorMessage?: string;
  numSegments?: string;
  price?: string;
  priceUnit?: string;
}

export interface SendSMSRequest {
  to: string;
  from: string;
  body: string;
  conversationId?: string;
}

export interface SendSMSResponse {
  success: boolean;
  message: string;
  data?: SMSMessage;
}

export interface GetSMSMessagesResponse {
  success: boolean;
  data: SMSMessage[];
}

/**
 * SMS Service for handling SMS operations
 */
export class SMSService {
  private static getBackendUrl(): string {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
  }

  /**
   * Send an SMS message
   */
  static async sendSMS(request: SendSMSRequest): Promise<SendSMSResponse> {
    try {
      const credentials = await getActiveTwilioCredentials();
      if (!credentials) {
        throw new Error('No active Twilio credentials found. Please configure your Twilio settings.');
      }

      const response = await fetch(`${this.getBackendUrl()}/api/v1/twilio/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountSid: credentials.account_sid,
          authToken: credentials.auth_token,
          to: request.to,
          from: request.from,
          body: request.body,
          conversationId: request.conversationId,
          userId: credentials.user_id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send SMS');
      }

      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Get SMS messages for a conversation
   */
  static async getSMSMessages(conversationId: string): Promise<SMSMessage[]> {
    try {
      const credentials = await getActiveTwilioCredentials();
      if (!credentials) {
        throw new Error('No active Twilio credentials found. Please configure your Twilio settings.');
      }

      const response = await fetch(
        `${this.getBackendUrl()}/api/v1/twilio/sms/conversation/${conversationId}?accountSid=${credentials.account_sid}&authToken=${credentials.auth_token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const result: GetSMSMessagesResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch SMS messages');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
      throw error;
    }
  }

  /**
   * Get SMS messages by phone number
   */
  static async getSMSMessagesByPhoneNumber(phoneNumber: string): Promise<SMSMessage[]> {
    try {
      const credentials = await getActiveTwilioCredentials();
      if (!credentials) {
        throw new Error('No active Twilio credentials found. Please configure your Twilio settings.');
      }

      // For now, we'll use the conversation endpoint
      // In a real implementation, you might want to create a separate endpoint
      // that filters by phone number
      const response = await fetch(
        `${this.getBackendUrl()}/api/v1/twilio/sms/conversation/phone-${phoneNumber}?accountSid=${credentials.account_sid}&authToken=${credentials.auth_token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const result: GetSMSMessagesResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch SMS messages');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching SMS messages by phone number:', error);
      throw error;
    }
  }

  /**
   * Format phone number for Twilio (ensure it starts with +)
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except + at the beginning
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it already starts with +, return as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    } else {
      // Add + for international format
      return `+${cleaned}`;
    }
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Basic validation - should start with + and have 7-15 digits (international standard)
    return /^\+\d{7,15}$/.test(formatted);
  }

  /**
   * Get user's Twilio phone number for sending SMS
   */
  static async getUserPhoneNumber(): Promise<string | null> {
    try {
      const credentials = await getActiveTwilioCredentials();
      if (!credentials) {
        return null;
      }

      // In a real implementation, you might want to store the user's phone number
      // in the database or fetch it from Twilio
      // For now, we'll return null and let the user specify
      return null;
    } catch (error) {
      console.error('Error getting user phone number:', error);
      return null;
    }
  }
}

// Export convenience functions
export const sendSMS = (request: SendSMSRequest) => SMSService.sendSMS(request);
export const getSMSMessages = (conversationId: string) => SMSService.getSMSMessages(conversationId);
export const getSMSMessagesByPhoneNumber = (phoneNumber: string) => SMSService.getSMSMessagesByPhoneNumber(phoneNumber);
export const formatPhoneNumber = (phoneNumber: string) => SMSService.formatPhoneNumber(phoneNumber);
export const isValidPhoneNumber = (phoneNumber: string) => SMSService.isValidPhoneNumber(phoneNumber);
export const getUserPhoneNumber = () => SMSService.getUserPhoneNumber();

