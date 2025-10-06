import { supabase } from "@/integrations/supabase/client";

export interface UpdateContactRequest {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  list_id?: string;
  status?: 'active' | 'inactive' | 'do-not-call';
  do_not_call?: boolean;
}

export interface UpdateContactResponse {
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
 * Update an existing contact
 */
export const updateContact = async (data: UpdateContactRequest): Promise<UpdateContactResponse> => {
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        list_id: data.list_id,
        status: data.status,
        do_not_call: data.do_not_call,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
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
    console.error('Error updating contact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
