import { supabase } from "@/integrations/supabase/client";

export interface CsvContactData {
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'do-not-call';
  do_not_call?: boolean;
}

export interface SaveCsvContactsRequest {
  csvFileId: string;
  contacts: CsvContactData[];
  userId: string;
}

export interface SaveCsvContactsResponse {
  success: boolean;
  savedCount?: number;
  error?: string;
}

/**
 * Save CSV contacts to database
 */
export const saveCsvContacts = async (data: SaveCsvContactsRequest): Promise<SaveCsvContactsResponse> => {
  try {
    // Prepare contacts for insertion
    const contactsToInsert = data.contacts.map(contact => ({
      csv_file_id: data.csvFileId,
      first_name: contact.first_name,
      last_name: contact.last_name || null,
      phone: contact.phone || null,
      email: contact.email || null,
      status: contact.status || 'active',
      do_not_call: contact.do_not_call || false,
      user_id: data.userId
    }));

    const { data: savedContacts, error } = await supabase
      .from('csv_contacts')
      .insert(contactsToInsert)
      .select();

    if (error) {
      console.error('Error saving CSV contacts:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      savedCount: savedContacts?.length || 0
    };

  } catch (error) {
    console.error('Error saving CSV contacts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
