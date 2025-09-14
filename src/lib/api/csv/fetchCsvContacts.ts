import { supabase } from "@/integrations/supabase/client";

export interface CsvContact {
  id: string;
  csv_file_id: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'do-not-call';
  do_not_call: boolean;
  user_id: string;
  created_at: string;
}

export interface CsvContactsResponse {
  contacts: CsvContact[];
  total: number;
}

/**
 * Fetch CSV contacts for a specific CSV file
 */
export const fetchCsvContacts = async (csvFileId: string): Promise<CsvContactsResponse> => {
  try {
    const { data: contacts, error } = await supabase
      .from('csv_contacts')
      .select('*')
      .eq('csv_file_id', csvFileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching CSV contacts:', error);
      throw error;
    }

    return {
      contacts: contacts || [],
      total: contacts?.length || 0
    };

  } catch (error) {
    console.error('Error fetching CSV contacts:', error);
    throw error;
  }
};
