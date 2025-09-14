import { supabase } from "@/integrations/supabase/client";

export interface CampaignStatus {
  campaign: {
    id: string;
    name: string;
    execution_status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    daily_cap: number;
    current_daily_calls: number;
    total_calls_made: number;
    total_calls_answered: number;
    last_execution_at: string | null;
    next_call_at: string | null;
    calling_days: string[];
    start_hour: number;
    end_hour: number;
  };
  stats: {
    total: number;
    pending: number;
    calling: number;
    completed: number;
    failed: number;
    answered: number;
    noAnswer: number;
    busy: number;
    interested: number;
    notInterested: number;
    callback: number;
    doNotCall: number;
  };
  queueStatus: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export interface GetCampaignStatusResponse {
  success: boolean;
  campaign?: CampaignStatus;
  error?: string;
}

/**
 * Get campaign status and metrics
 */
export const getCampaignStatus = async (campaignId: string): Promise<GetCampaignStatusResponse> => {
  try {
    const response = await fetch(`/api/v1/campaigns/${campaignId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to get campaign status'
      };
    }

    return result;

  } catch (error) {
    console.error('Error getting campaign status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
