import { supabase } from "@/integrations/supabase/client";

export interface DeleteCsvFileRequest {
  csvFileId: string;
}

export interface DeleteCsvFileResponse {
  success: boolean;
  message?: string;
  error?: string;
  campaigns?: Array<{ id: string; name: string }>;
}

/**
 * Delete a CSV file
 */
export const deleteCsvFile = async (data: DeleteCsvFileRequest): Promise<DeleteCsvFileResponse> => {
  try {
    const response = await fetch(`/api/v1/csv/${data.csvFileId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to delete CSV file',
        campaigns: result.campaigns
      };
    }

    return result;

  } catch (error) {
    console.error('Error deleting CSV file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
