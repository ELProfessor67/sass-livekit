import { supabase } from "@/integrations/supabase/client";

export interface AssignPhoneNumberRequest {
  assistantId: string;
  phoneNumber: string;
  label?: string;
}

export interface AssignPhoneNumberResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Assign a phone number to an assistant for outbound calls
 */
export const assignPhoneNumber = async (data: AssignPhoneNumberRequest): Promise<AssignPhoneNumberResponse> => {
  try {
    const { data: result, error } = await supabase
      .from('phone_number')
      .upsert({
        number: data.phoneNumber,
        inbound_assistant_id: data.assistantId,
        label: data.label || `Assistant ${data.assistantId}`,
        status: 'active',
        webhook_status: 'configured'
      }, {
        onConflict: 'number'
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning phone number:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      message: 'Phone number assigned successfully'
    };

  } catch (error) {
    console.error('Error assigning phone number:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
