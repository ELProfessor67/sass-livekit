import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface Assistant {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  first_message?: string;
  first_sms?: string;
  sms_prompt?: string;
  whatsapp_credentials_id?: string;
  status: "draft" | "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface AssistantsResponse {
  assistants: Assistant[];
  total: number;
}

/**
 * Fetch all assistants for the current user
 */
export const fetchAssistants = async (): Promise<AssistantsResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    console.log('Fetching assistants for user ID:', userId);
    
    // Get user's tenant
    const { data: userData } = await supabase
      .from('users')
      .select('tenant')
      .eq('id', userId)
      .single();

    const tenant = userData?.tenant || 'main';

    // Build query with tenant filter
    let query = supabase
      .from('assistant')
      .select('id, name, prompt, first_message, first_sms, sms_prompt, whatsapp_credentials_id, created_at, updated_at')
      .eq('user_id', userId);

    // Add tenant filter
    if (tenant === 'main') {
      query = query.or('tenant.eq.main,tenant.is.null');
    } else {
      query = query.eq('tenant', tenant);
    }

    const { data: assistants, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assistants:', error);
      throw error;
    }

    if (!assistants || assistants.length === 0) {
      return {
        assistants: [],
        total: 0
      };
    }

    // Transform the data to match our interface
    const transformedAssistants: Assistant[] = assistants.map(assistant => ({
      id: assistant.id,
      name: assistant.name || 'Unnamed Assistant',
      description: assistant.prompt ? assistant.prompt.substring(0, 100) + '...' : undefined,
      prompt: assistant.prompt,
      first_message: assistant.first_message,
      first_sms: assistant.first_sms,
      sms_prompt: assistant.sms_prompt,
      whatsapp_credentials_id: assistant.whatsapp_credentials_id,
      status: 'active', // Default status since we don't have this field yet
      created_at: assistant.created_at,
      updated_at: assistant.updated_at
    }));

    return {
      assistants: transformedAssistants,
      total: transformedAssistants.length
    };

  } catch (error) {
    console.error('Error fetching assistants:', error);
    throw error;
  }
};
