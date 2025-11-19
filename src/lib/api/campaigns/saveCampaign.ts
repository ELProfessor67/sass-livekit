import { supabase } from "@/integrations/supabase/client";

export interface SaveCampaignRequest {
  name: string;
  assistantId: string;
  contactSource: 'contact_list' | 'csv_file';
  contactListId?: string;
  csvFileId?: string;
  dailyCap: number;
  callingDays: string[];
  startHour: number;
  endHour: number;
  campaignPrompt: string;
  userId: string;
}

export interface SaveCampaignResponse {
  success: boolean;
  campaignId?: string;
  error?: string;
}

/**
 * Save campaign to database
 */
export const saveCampaign = async (data: SaveCampaignRequest): Promise<SaveCampaignResponse> => {
  try {
    // Get user's tenant to ensure proper data isolation
    const { data: userData } = await supabase
      .from('users')
      .select('tenant')
      .eq('id', data.userId)
      .single();

    const tenant = userData?.tenant || 'main';

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([{
        name: data.name,
        user_id: data.userId,
        assistant_id: data.assistantId,
        contact_list_id: data.contactListId || null,
        csv_file_id: data.csvFileId || null,
        contact_source: data.contactSource,
        daily_cap: data.dailyCap,
        calling_days: data.callingDays,
        start_hour: data.startHour,
        end_hour: data.endHour,
        campaign_prompt: data.campaignPrompt,
        status: 'draft',
        execution_status: 'idle',
        tenant: tenant  // CRITICAL: Set tenant for data isolation
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving campaign:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      campaignId: campaign.id
    };

  } catch (error) {
    console.error('Error saving campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
