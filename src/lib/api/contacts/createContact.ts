import { supabase } from "@/integrations/supabase/client";

export interface CreateContactRequest {
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  list_id: string;
  status?: 'active' | 'inactive' | 'do-not-call';
  do_not_call?: boolean;
  user_id: string;
}

export interface CreateContactResponse {
  success: boolean;
  contact?: {
    id: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    email?: string;
    list_id: string;
    status: 'active' | 'inactive' | 'do-not-call';
    do_not_call: boolean;
    created_at: string;
    updated_at: string;
    user_id: string;
  };
  error?: string;
}

/**
 * Create a new contact
 */
export const createContact = async (data: CreateContactRequest): Promise<CreateContactResponse> => {
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert([{
        first_name: data.first_name,
        last_name: data.last_name || null,
        phone: data.phone || null,
        email: data.email || null,
        list_id: data.list_id,
        status: data.status || 'active',
        do_not_call: data.do_not_call || false,
        user_id: data.user_id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      contact: {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        email: contact.email,
        list_id: contact.list_id,
        status: contact.status,
        do_not_call: contact.do_not_call,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        user_id: contact.user_id
      }
    };

  } catch (error) {
    console.error('Error creating contact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
