import { supabase } from "@/integrations/supabase/client";

export interface DeleteContactRequest {
  id: string;
}

export interface DeleteContactResponse {
  success: boolean;
  error?: string;
}

/**
 * Delete a contact
 */
export const deleteContact = async (data: DeleteContactRequest): Promise<DeleteContactResponse> => {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', data.id);

    if (error) {
      console.error('Error deleting contact:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error deleting contact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
