import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  list_id: string;
  list_name: string;
  status: 'active' | 'inactive' | 'do-not-call';
  do_not_call: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
}

/**
 * Fetch contacts from Supabase with optional list filtering
 */
export const fetchContacts = async (listId?: string): Promise<ContactsResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    console.log('Fetching contacts for user ID:', userId);
    
    let query = supabase
      .from('contacts')
      .select(`
        *,
        contact_lists!inner(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (listId) {
      query = query.eq('list_id', listId);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    if (!contacts || contacts.length === 0) {
      return {
        contacts: [],
        total: 0
      };
    }

    // Transform the data to include list name
    const transformedContacts = contacts.map(contact => ({
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      phone: contact.phone,
      email: contact.email,
      list_id: contact.list_id,
      list_name: contact.contact_lists?.name || 'Unknown List',
      status: contact.status as 'active' | 'inactive' | 'do-not-call',
      do_not_call: contact.do_not_call || false,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      user_id: contact.user_id
    }));

    return {
      contacts: transformedContacts,
      total: transformedContacts.length
    };

  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
};
