import { supabase } from "@/integrations/supabase/client";

export interface SaveCsvFileRequest {
  name: string;
  rowCount: number;
  fileSize?: number;
  userId: string;
}

export interface SaveCsvFileResponse {
  success: boolean;
  csvFileId?: string;
  error?: string;
}

/**
 * Save CSV file metadata to database
 */
export const saveCsvFile = async (data: SaveCsvFileRequest): Promise<SaveCsvFileResponse> => {
  try {
    const { data: csvFile, error } = await supabase
      .from('csv_files')
      .insert([{
        name: data.name,
        user_id: data.userId,
        row_count: data.rowCount,
        file_size: data.fileSize || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving CSV file:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      csvFileId: csvFile.id
    };

  } catch (error) {
    console.error('Error saving CSV file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
