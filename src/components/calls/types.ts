
export interface CallTag {
  id: string;
  name: string;
  color: string;
}

export interface CallAnalysis {
  property_type?: string;
  budget_range?: string;
  urgency?: string;
  product_interest?: string;
  spam_likelihood?: string;
  out_of_area?: string;
  [key: string]: any;
}

interface Message {
  id: string;
  text: string;
  timestamp: string;
  direction: "inbound" | "outbound";
}

export interface Call {
  id: string;
  first_name?: string;
  last_name?: string;
  name: string;
  phoneNumber: string;
  date: string;
  time: string;
  duration: string;
  direction: string;
  channel: string;
  tags: CallTag[];
  status: string;
  resolution?: string;
  call_recording?: string;
  summary?: string;
  transcript?: any;
  analysis?: CallAnalysis | null;
  address?: string;
  messages?: Message[];
  created_at?: string;
  call_sid?: string;
  recording_info?: any;
  assistant_id?: string;
  structured_data?: any;
}

export interface CallsData {
  calls: Call[];
  total: number;
}

export interface TranscriptEntry {
  speaker: string;
  time: string;
  text: string;
}
