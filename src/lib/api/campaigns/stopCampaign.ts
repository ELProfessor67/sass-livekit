import { supabase } from "@/integrations/supabase/client";

export interface StopCampaignRequest {
  campaignId: string;
}

export interface StopCampaignResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Stop a campaign execution
 */
export const stopCampaign = async (data: StopCampaignRequest): Promise<StopCampaignResponse> => {
  try {
    const response = await fetch(`/api/v1/campaigns/${data.campaignId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to stop campaign'
      };
    }

    return result;

  } catch (error) {
    console.error('Error stopping campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
