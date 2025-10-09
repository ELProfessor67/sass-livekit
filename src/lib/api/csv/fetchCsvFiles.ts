import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface CsvFile {
  id: string;
  name: string;
  user_id: string;
  row_count: number;
  file_size?: number;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface CsvFilesResponse {
  csvFiles: CsvFile[];
  total: number;
}

/**
 * Fetch CSV files for the current user
 */
export const fetchCsvFiles = async (): Promise<CsvFilesResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    console.log('Fetching CSV files for user ID:', userId);
    
    const { data: csvFiles, error } = await supabase
      .from('csv_files')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

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
