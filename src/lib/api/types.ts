
import { Call, CallAnalysis } from "@/components/calls/types";

export interface MockCall extends Call {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  phoneNumber: string;
  date: string;
  time: string;
  duration: string;
  direction: string;
  channel: string;
  address: string | null;
  analysis: CallAnalysis | null;
  tags: any[];
  status: string;
  resolution: string | null;
  summary: string;
  transcript: any[] | null;
  call_recording: string | null;
}

export interface CallTag {
  id: string;
  name: string;
  color: string;
}

export type ResolutionType = 'Appointment' | 'Booked Appointment' | 'Message to Franchisee' | 'Not Eligible' | 'Spam' | 'Call Dropped' | null;
