import { supabase } from '@/integrations/supabase/client';

export interface CampaignCallExport {
  id: string;
  campaign_name: string;
  contact_name: string;
  phone_number: string;
  status: string;
  outcome: string | null;
  call_duration: number;
  recording_url: string | null;
  transcription: any;
  summary: string | null;
  notes: string | null;
  retry_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CampaignStatsExport {
  campaign_name: string;
  execution_status: string;
  daily_cap: number;
  current_daily_calls: number;
  total_calls_made: number;
  total_calls_answered: number;
  answer_rate: number;
  interested_count: number;
  not_interested_count: number;
  callback_count: number;
  do_not_call_count: number;
  voicemail_count: number;
  wrong_number_count: number;
  success_rate: number;
  interest_rate: number;
  created_at: string;
  last_execution_at: string | null;
  next_call_at: string | null;
}

export async function exportCampaignCalls(campaignId: string): Promise<{
  success: boolean;
  calls?: CampaignCallExport[];
  error?: string;
}> {
  try {
    const { data: calls, error } = await supabase
      .from('campaign_calls')
      .select(`
        id,
        phone_number,
        contact_name,
        status,
        outcome,
        call_duration,
        recording_url,
        transcription,
        summary,
        notes,
        retry_count,
        scheduled_at,
        started_at,
        completed_at,
        created_at,
        campaigns!inner(
          name
        )
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaign calls:', error);
      return { success: false, error: error.message };
    }

    const exportData: CampaignCallExport[] = calls.map(call => ({
      id: call.id,
      campaign_name: call.campaigns.name,
      contact_name: call.contact_name || 'Unknown',
      phone_number: call.phone_number,
      status: call.status,
      outcome: call.outcome,
      call_duration: call.call_duration || 0,
      recording_url: call.recording_url,
      transcription: call.transcription,
      summary: call.summary,
      notes: call.notes,
      retry_count: call.retry_count || 0,
      scheduled_at: call.scheduled_at,
      started_at: call.started_at,
      completed_at: call.completed_at,
      created_at: call.created_at
    }));

    return { success: true, calls: exportData };
  } catch (error) {
    console.error('Error exporting campaign calls:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function exportCampaignStats(campaignId: string): Promise<{
  success: boolean;
  stats?: CampaignStatsExport[];
  error?: string;
}> {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        execution_status,
        daily_cap,
        current_daily_calls,
        total_calls_made,
        total_calls_answered,
        created_at,
        last_execution_at,
        next_call_at
      `)
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return { success: false, error: error.message };
    }

    // Get call outcome statistics
    const { data: callStats, error: statsError } = await supabase
      .from('campaign_calls')
      .select('outcome')
      .eq('campaign_id', campaignId);

    if (statsError) {
      console.error('Error fetching call stats:', statsError);
      return { success: false, error: statsError.message };
    }

    // Calculate outcome counts
    const outcomeCounts = {
      interested: 0,
      not_interested: 0,
      callback: 0,
      do_not_call: 0,
      voicemail: 0,
      wrong_number: 0
    };

    callStats.forEach(call => {
      if (call.outcome && outcomeCounts.hasOwnProperty(call.outcome)) {
        outcomeCounts[call.outcome as keyof typeof outcomeCounts]++;
      }
    });

    // Calculate rates
    const answerRate = campaign.total_calls_made > 0 
      ? (campaign.total_calls_answered / campaign.total_calls_made) * 100 
      : 0;
    
    const successRate = campaign.total_calls_made > 0 
      ? ((outcomeCounts.interested + outcomeCounts.callback) / campaign.total_calls_made) * 100 
      : 0;
    
    const interestRate = campaign.total_calls_answered > 0 
      ? (outcomeCounts.interested / campaign.total_calls_answered) * 100 
      : 0;

    const exportData: CampaignStatsExport[] = [{
      campaign_name: campaign.name,
      execution_status: campaign.execution_status,
      daily_cap: campaign.daily_cap,
      current_daily_calls: campaign.current_daily_calls,
      total_calls_made: campaign.total_calls_made,
      total_calls_answered: campaign.total_calls_answered,
      answer_rate: answerRate,
      interested_count: outcomeCounts.interested,
      not_interested_count: outcomeCounts.not_interested,
      callback_count: outcomeCounts.callback,
      do_not_call_count: outcomeCounts.do_not_call,
      voicemail_count: outcomeCounts.voicemail,
      wrong_number_count: outcomeCounts.wrong_number,
      success_rate: successRate,
      interest_rate: interestRate,
      created_at: campaign.created_at,
      last_execution_at: campaign.last_execution_at,
      next_call_at: campaign.next_call_at
    }];

    return { success: true, stats: exportData };
  } catch (error) {
    console.error('Error exporting campaign stats:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function exportAllCampaignsData(): Promise<{
  success: boolean;
  calls?: CampaignCallExport[];
  stats?: CampaignStatsExport[];
  error?: string;
}> {
  try {
    // Get all campaigns for the user
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return { success: false, error: campaignsError.message };
    }

    if (!campaigns || campaigns.length === 0) {
      return { success: true, calls: [], stats: [] };
    }

    // Get all calls for all campaigns
    const { data: calls, error: callsError } = await supabase
      .from('campaign_calls')
      .select(`
        id,
        campaign_id,
        phone_number,
        contact_name,
        status,
        outcome,
        call_duration,
        recording_url,
        transcription,
        summary,
        notes,
        retry_count,
        scheduled_at,
        started_at,
        completed_at,
        created_at,
        campaigns!inner(
          name
        )
      `)
      .in('campaign_id', campaigns.map(c => c.id))
      .order('created_at', { ascending: false });

    if (callsError) {
      console.error('Error fetching calls:', callsError);
      return { success: false, error: callsError.message };
    }

    // Get campaign statistics
    const { data: campaignStats, error: statsError } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        execution_status,
        daily_cap,
        current_daily_calls,
        total_calls_made,
        total_calls_answered,
        created_at,
        last_execution_at,
        next_call_at
      `)
      .in('id', campaigns.map(c => c.id))
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('Error fetching campaign stats:', statsError);
      return { success: false, error: statsError.message };
    }

    // Process calls data
    const callsExportData: CampaignCallExport[] = calls.map(call => ({
      id: call.id,
      campaign_name: call.campaigns.name,
      contact_name: call.contact_name || 'Unknown',
      phone_number: call.phone_number,
      status: call.status,
      outcome: call.outcome,
      call_duration: call.call_duration || 0,
      recording_url: call.recording_url,
      transcription: call.transcription,
      summary: call.summary,
      notes: call.notes,
      retry_count: call.retry_count || 0,
      scheduled_at: call.scheduled_at,
      started_at: call.started_at,
      completed_at: call.completed_at,
      created_at: call.created_at
    }));

    // Process stats data
    const statsExportData: CampaignStatsExport[] = await Promise.all(
      campaignStats.map(async (campaign) => {
        // Get call outcome statistics for this campaign
        const { data: callStats } = await supabase
          .from('campaign_calls')
          .select('outcome')
          .eq('campaign_id', campaign.id);

        const outcomeCounts = {
          interested: 0,
          not_interested: 0,
          callback: 0,
          do_not_call: 0,
          voicemail: 0,
          wrong_number: 0
        };

        callStats?.forEach(call => {
          if (call.outcome && outcomeCounts.hasOwnProperty(call.outcome)) {
            outcomeCounts[call.outcome as keyof typeof outcomeCounts]++;
          }
        });

        // Calculate rates
        const answerRate = campaign.total_calls_made > 0 
          ? (campaign.total_calls_answered / campaign.total_calls_made) * 100 
          : 0;
        
        const successRate = campaign.total_calls_made > 0 
          ? ((outcomeCounts.interested + outcomeCounts.callback) / campaign.total_calls_made) * 100 
          : 0;
        
        const interestRate = campaign.total_calls_answered > 0 
          ? (outcomeCounts.interested / campaign.total_calls_answered) * 100 
          : 0;

        return {
          campaign_name: campaign.name,
          execution_status: campaign.execution_status,
          daily_cap: campaign.daily_cap,
          current_daily_calls: campaign.current_daily_calls,
          total_calls_made: campaign.total_calls_made,
          total_calls_answered: campaign.total_calls_answered,
          answer_rate: answerRate,
          interested_count: outcomeCounts.interested,
          not_interested_count: outcomeCounts.not_interested,
          callback_count: outcomeCounts.callback,
          do_not_call_count: outcomeCounts.do_not_call,
          voicemail_count: outcomeCounts.voicemail,
          wrong_number_count: outcomeCounts.wrong_number,
          success_rate: successRate,
          interest_rate: interestRate,
          created_at: campaign.created_at,
          last_execution_at: campaign.last_execution_at,
          next_call_at: campaign.next_call_at
        };
      })
    );

    return { 
      success: true, 
      calls: callsExportData, 
      stats: statsExportData 
    };
  } catch (error) {
    console.error('Error exporting all campaigns data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
