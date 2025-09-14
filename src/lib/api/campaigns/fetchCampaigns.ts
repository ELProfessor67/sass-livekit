import { supabase } from "@/integrations/supabase/client";

export interface Campaign {
  id: string;
  name: string;
  user_id: string;
  assistant_id?: string;
  assistant_name?: string;
  contact_list_id?: string;
  contact_list_name?: string;
  csv_file_id?: string;
  csv_file_name?: string;
  contact_source: 'contact_list' | 'csv_file';
  daily_cap: number;
  calling_days: string[];
  start_hour: number;
  end_hour: number;
  campaign_prompt: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  execution_status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  dials: number;
  pickups: number;
  do_not_call: number;
  interested: number;
  not_interested: number;
  callback: number;
  total_usage: number;
  current_daily_calls: number;
  total_calls_made: number;
  total_calls_answered: number;
  last_execution_at: string | null;
  next_call_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
}

/**
 * Fetch campaigns for the current user
 */
export const fetchCampaigns = async (): Promise<CampaignsResponse> => {
  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        assistant:assistant(name),
        contact_list:contact_lists(name),
        csv_file:csv_files(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }

    // Transform the data to include related names
    const transformedCampaigns: Campaign[] = (campaigns || []).map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      user_id: campaign.user_id,
      assistant_id: campaign.assistant_id,
      assistant_name: campaign.assistant?.name,
      contact_list_id: campaign.contact_list_id,
      contact_list_name: campaign.contact_list?.name,
      csv_file_id: campaign.csv_file_id,
      csv_file_name: campaign.csv_file?.name,
      contact_source: campaign.contact_source,
      daily_cap: campaign.daily_cap,
      calling_days: campaign.calling_days,
      start_hour: campaign.start_hour,
      end_hour: campaign.end_hour,
      campaign_prompt: campaign.campaign_prompt,
      status: campaign.status,
      execution_status: campaign.execution_status,
      dials: campaign.dials,
      pickups: campaign.pickups,
      do_not_call: campaign.do_not_call,
      interested: campaign.interested,
      not_interested: campaign.not_interested,
      callback: campaign.callback,
      total_usage: campaign.total_usage,
      current_daily_calls: campaign.current_daily_calls,
      total_calls_made: campaign.total_calls_made,
      total_calls_answered: campaign.total_calls_answered,
      last_execution_at: campaign.last_execution_at,
      next_call_at: campaign.next_call_at,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at
    }));

    return {
      campaigns: transformedCampaigns,
      total: transformedCampaigns.length
    };

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
};
