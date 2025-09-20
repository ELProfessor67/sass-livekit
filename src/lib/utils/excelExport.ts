import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

export function exportCampaignCallsToExcel(
  calls: CampaignCallExport[],
  campaignName: string
) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Prepare the data for export
  const exportData = calls.map(call => ({
    'Call ID': call.id,
    'Campaign Name': call.campaign_name,
    'Contact Name': call.contact_name || 'Unknown',
    'Phone Number': call.phone_number,
    'Status': call.status,
    'Outcome': call.outcome || 'N/A',
    'Duration (seconds)': call.call_duration,
    'Duration (formatted)': formatDuration(call.call_duration),
    'Recording URL': call.recording_url || 'N/A',
    'Transcription': call.transcription ? JSON.stringify(call.transcription) : 'N/A',
    'Summary': call.summary || 'N/A',
    'Notes': call.notes || 'N/A',
    'Retry Count': call.retry_count,
    'Scheduled At': call.scheduled_at ? formatDateTime(call.scheduled_at) : 'N/A',
    'Started At': call.started_at ? formatDateTime(call.started_at) : 'N/A',
    'Completed At': call.completed_at ? formatDateTime(call.completed_at) : 'N/A',
    'Created At': formatDateTime(call.created_at)
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Call ID
    { wch: 20 }, // Campaign Name
    { wch: 20 }, // Contact Name
    { wch: 15 }, // Phone Number
    { wch: 12 }, // Status
    { wch: 15 }, // Outcome
    { wch: 15 }, // Duration (seconds)
    { wch: 15 }, // Duration (formatted)
    { wch: 30 }, // Recording URL
    { wch: 50 }, // Transcription
    { wch: 30 }, // Summary
    { wch: 30 }, // Notes
    { wch: 12 }, // Retry Count
    { wch: 20 }, // Scheduled At
    { wch: 20 }, // Started At
    { wch: 20 }, // Completed At
    { wch: 20 }  // Created At
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign Calls');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Campaign_Calls_${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;

  // Export the file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, filename);
}

export function exportCampaignStatsToExcel(
  stats: CampaignStatsExport[],
  filename: string = 'Campaign_Statistics'
) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Prepare the data for export
  const exportData = stats.map(stat => ({
    'Campaign Name': stat.campaign_name,
    'Status': stat.execution_status,
    'Daily Cap': stat.daily_cap,
    'Calls Today': stat.current_daily_calls,
    'Total Calls Made': stat.total_calls_made,
    'Total Calls Answered': stat.total_calls_answered,
    'Answer Rate (%)': `${stat.answer_rate.toFixed(1)}%`,
    'Interested': stat.interested_count,
    'Not Interested': stat.not_interested_count,
    'Callback': stat.callback_count,
    'Do Not Call': stat.do_not_call_count,
    'Voicemail': stat.voicemail_count,
    'Wrong Number': stat.wrong_number_count,
    'Success Rate (%)': `${stat.success_rate.toFixed(1)}%`,
    'Interest Rate (%)': `${stat.interest_rate.toFixed(1)}%`,
    'Created At': formatDateTime(stat.created_at),
    'Last Execution': stat.last_execution_at ? formatDateTime(stat.last_execution_at) : 'N/A',
    'Next Call': stat.next_call_at ? formatDateTime(stat.next_call_at) : 'N/A'
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Campaign Name
    { wch: 12 }, // Status
    { wch: 12 }, // Daily Cap
    { wch: 12 }, // Calls Today
    { wch: 15 }, // Total Calls Made
    { wch: 18 }, // Total Calls Answered
    { wch: 15 }, // Answer Rate
    { wch: 12 }, // Interested
    { wch: 15 }, // Not Interested
    { wch: 10 }, // Callback
    { wch: 12 }, // Do Not Call
    { wch: 12 }, // Voicemail
    { wch: 12 }, // Wrong Number
    { wch: 15 }, // Success Rate
    { wch: 15 }, // Interest Rate
    { wch: 20 }, // Created At
    { wch: 20 }, // Last Execution
    { wch: 20 }  // Next Call
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign Statistics');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Export the file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, finalFilename);
}

export function exportAllCampaignDataToExcel(
  calls: CampaignCallExport[],
  stats: CampaignStatsExport[],
  campaignName: string
) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Export calls data
  const callsData = calls.map(call => ({
    'Call ID': call.id,
    'Campaign Name': call.campaign_name,
    'Contact Name': call.contact_name || 'Unknown',
    'Phone Number': call.phone_number,
    'Status': call.status,
    'Outcome': call.outcome || 'N/A',
    'Duration (seconds)': call.call_duration,
    'Duration (formatted)': formatDuration(call.call_duration),
    'Recording URL': call.recording_url || 'N/A',
    'Transcription': call.transcription ? JSON.stringify(call.transcription) : 'N/A',
    'Summary': call.summary || 'N/A',
    'Notes': call.notes || 'N/A',
    'Retry Count': call.retry_count,
    'Scheduled At': call.scheduled_at ? formatDateTime(call.scheduled_at) : 'N/A',
    'Started At': call.started_at ? formatDateTime(call.started_at) : 'N/A',
    'Completed At': call.completed_at ? formatDateTime(call.completed_at) : 'N/A',
    'Created At': formatDateTime(call.created_at)
  }));

  const callsWorksheet = XLSX.utils.json_to_sheet(callsData);
  callsWorksheet['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 30 },
    { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, callsWorksheet, 'Campaign Calls');

  // Export stats data
  const statsData = stats.map(stat => ({
    'Campaign Name': stat.campaign_name,
    'Status': stat.execution_status,
    'Daily Cap': stat.daily_cap,
    'Calls Today': stat.current_daily_calls,
    'Total Calls Made': stat.total_calls_made,
    'Total Calls Answered': stat.total_calls_answered,
    'Answer Rate (%)': `${stat.answer_rate.toFixed(1)}%`,
    'Interested': stat.interested_count,
    'Not Interested': stat.not_interested_count,
    'Callback': stat.callback_count,
    'Do Not Call': stat.do_not_call_count,
    'Voicemail': stat.voicemail_count,
    'Wrong Number': stat.wrong_number_count,
    'Success Rate (%)': `${stat.success_rate.toFixed(1)}%`,
    'Interest Rate (%)': `${stat.interest_rate.toFixed(1)}%`,
    'Created At': formatDateTime(stat.created_at),
    'Last Execution': stat.last_execution_at ? formatDateTime(stat.last_execution_at) : 'N/A',
    'Next Call': stat.next_call_at ? formatDateTime(stat.next_call_at) : 'N/A'
  }));

  const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
  statsWorksheet['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 },
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Campaign Statistics');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Complete_Campaign_Data_${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;

  // Export the file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, filename);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
