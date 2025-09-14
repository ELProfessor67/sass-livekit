import { supabase } from "@/integrations/supabase/client";

export interface CampaignCall {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  phone_number: string;
  contact_name: string | null;
  call_sid: string | null;
  room_name: string | null;
  status: 'pending' | 'queued' | 'calling' | 'answered' | 'completed' | 'failed' | 'no_answer' | 'busy' | 'do_not_call';
  outcome: 'interested' | 'not_interested' | 'callback' | 'do_not_call' | 'voicemail' | 'wrong_number' | null;
  call_duration: number;
  recording_url: string | null;
  transcription: any;
  summary: string | null;
  notes: string | null;
  retry_count: number;
  max_retries: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetCampaignCallsResponse {
  success: boolean;
  calls?: CampaignCall[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
}

export interface GetCampaignCallsParams {
  campaignId: string;
  status?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get campaign calls with pagination
 */
export const getCampaignCalls = async (params: GetCampaignCallsParams): Promise<GetCampaignCallsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.outcome) queryParams.append('outcome', params.outcome);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`/api/v1/campaigns/${params.campaignId}/calls?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to get campaign calls'
      };
    }

    return result;

  } catch (error) {
    console.error('Error getting campaign calls:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
