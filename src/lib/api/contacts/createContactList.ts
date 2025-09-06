import { supabase } from "@/integrations/supabase/client";

export interface CreateContactListRequest {
  name: string;
  user_id: string;
}

export interface CreateContactListResponse {
  success: boolean;
  contactList?: {
    id: string;
    name: string;
    count: number;
    created_at: string;
    updated_at: string;
    user_id: string;
  };
  error?: string;
}

/**
 * Create a new contact list
 */
export const createContactList = async (data: CreateContactListRequest): Promise<CreateContactListResponse> => {
  try {
    const { data: contactList, error } = await supabase
      .from('contact_lists')
      .insert([{
        name: data.name,
        user_id: data.user_id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating contact list:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      contactList: {
        id: contactList.id,
        name: contactList.name,
        count: 0,
        created_at: contactList.created_at,
        updated_at: contactList.updated_at,
        user_id: contactList.user_id
      }
    };

  } catch (error) {
    console.error('Error creating contact list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
