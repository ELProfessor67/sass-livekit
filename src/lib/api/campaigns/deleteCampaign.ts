import { supabase } from "@/integrations/supabase/client";

export interface DeleteCampaignRequest {
  campaignId: string;
}

export interface DeleteCampaignResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Delete a campaign
 */
export const deleteCampaign = async (data: DeleteCampaignRequest): Promise<DeleteCampaignResponse> => {
  try {
    const response = await fetch(`/api/v1/campaigns/${data.campaignId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to delete campaign'
      };
    }

    return result;

  } catch (error) {
    console.error('Error deleting campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
