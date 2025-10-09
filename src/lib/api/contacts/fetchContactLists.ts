import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface ContactList {
  id: string;
  name: string;
  count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ContactListsResponse {
  contactLists: ContactList[];
  total: number;
}

/**
 * Fetch contact lists from Supabase
 */
export const fetchContactLists = async (): Promise<ContactListsResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    console.log('Fetching contact lists for user ID:', userId);
    
    const { data: contactLists, error } = await supabase
      .from('contact_lists')
      .select(`
        *,
        contacts:contacts(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contact lists:', error);
      throw error;
    }

    if (!contactLists || contactLists.length === 0) {
      return {
        contactLists: [],
        total: 0
      };
    }

    // Transform the data to include contact count
    const transformedLists = contactLists.map(list => ({
      id: list.id,
      name: list.name,
      count: list.contacts?.[0]?.count || 0,
      created_at: list.created_at,
      updated_at: list.updated_at,
      user_id: list.user_id
    }));

    return {
      contactLists: transformedLists,
      total: transformedLists.length
    };

  } catch (error) {
    console.error('Error fetching contact lists:', error);
    throw error;
  }
};
