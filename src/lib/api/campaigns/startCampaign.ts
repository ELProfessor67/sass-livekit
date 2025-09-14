import { supabase } from "@/integrations/supabase/client";

export interface StartCampaignRequest {
  campaignId: string;
}

export interface StartCampaignResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Start a campaign execution
 */
export const startCampaign = async (data: StartCampaignRequest): Promise<StartCampaignResponse> => {
  try {
    const response = await fetch(`/api/v1/campaigns/${data.campaignId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to start campaign'
      };
    }

    return result;

  } catch (error) {
    console.error('Error starting campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
