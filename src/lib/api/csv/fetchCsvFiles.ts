import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface CsvFile {
  id: string;
  name: string;
  user_id: string;
  workspace_id?: string | null;
  tenant?: string | null;
  row_count: number;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface CsvFilesResponse {
  csvFiles: CsvFile[];
  total: number;
}

/**
 * Fetch CSV files for a specific workspace
 */
export const fetchCsvFiles = async (workspaceId?: string): Promise<CsvFilesResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    console.log('Fetching CSV files for user ID:', userId);

    let query = supabase
      .from('csv_files')
      .select('*');

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: csvFiles, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching CSV files:', error);
      throw error;
    }

    return {
      csvFiles: csvFiles || [],
      total: csvFiles?.length || 0
    };

  } catch (error) {
    console.error('Error fetching CSV files:', error);
    throw error;
  }
};
