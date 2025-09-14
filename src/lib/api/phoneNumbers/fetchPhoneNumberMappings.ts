import { supabase } from "@/integrations/supabase/client";

export interface PhoneNumberMapping {
  number: string;
  inbound_assistant_id: string | null;
}

export interface PhoneNumberMappingsResponse {
  mappings: PhoneNumberMapping[];
  total: number;
}

/**
 * Fetch phone number to assistant mappings
 */
export const fetchPhoneNumberMappings = async (): Promise<PhoneNumberMappingsResponse> => {
  try {
    const { data: mappings, error } = await supabase
      .from('phone_number')
      .select('number, inbound_assistant_id')
      .not('inbound_assistant_id', 'is', null); // Only get numbers with assigned assistants

    if (error) {
      console.error('Error fetching phone number mappings:', error);
      throw error;
    }

    if (!mappings || mappings.length === 0) {
      return {
        mappings: [],
        total: 0
      };
    }

    return {
      mappings: mappings as PhoneNumberMapping[],
      total: mappings.length
    };

  } catch (error) {
    console.error('Error fetching phone number mappings:', error);
    throw error;
  }
};
