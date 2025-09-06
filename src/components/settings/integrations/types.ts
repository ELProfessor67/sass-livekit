
export interface TwilioIntegration {
  id: string;
  name: "Twilio";
  description: string;
  status: "connected";
  lastUsed: string;
  details: {
    account: string;
    label: string;
    trunkSid?: string;
  };
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  label: string;
}

export type Integration = TwilioIntegration;
