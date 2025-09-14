import { supabase } from "@/integrations/supabase/client";

export interface ResumeCampaignRequest {
  campaignId: string;
}

export interface ResumeCampaignResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Resume a paused campaign
 */
export const resumeCampaign = async (data: ResumeCampaignRequest): Promise<ResumeCampaignResponse> => {
  try {
    const response = await fetch(`/api/v1/campaigns/${data.campaignId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to resume campaign'
      };
    }

    return result;

  } catch (error) {
    console.error('Error resuming campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
