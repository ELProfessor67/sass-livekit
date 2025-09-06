import { supabase } from "@/integrations/supabase/client";
import type { TwilioCredentials } from "@/components/settings/integrations/types";

export interface UserTwilioCredentials {
  id: string;
  user_id: string;
  account_sid: string;
  auth_token: string;
  trunk_sid: string;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TwilioCredentialsInput {
  accountSid: string;
  authToken: string;
  label: string;
}

/**
 * Service for managing user-specific Twilio credentials
 */
export class TwilioCredentialsService {
  /**
   * Get the active Twilio credentials for the current user
   */
  static async getActiveCredentials(): Promise<UserTwilioCredentials | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_twilio_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching Twilio credentials:", error);
      return null;
    }
  }

  /**
   * Save new Twilio credentials for the current user
   * This will automatically create a main trunk for the user
   */
  static async saveCredentials(credentials: TwilioCredentialsInput): Promise<UserTwilioCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, create the main trunk for the user
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/v1/twilio/user/create-main-trunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          accountSid: credentials.accountSid,
          authToken: credentials.authToken,
          label: credentials.label
        })
      });

      const trunkResult = await response.json();
      if (!trunkResult.success) {
        throw new Error(trunkResult.message || 'Failed to create main trunk');
      }

      const { data, error } = await supabase
        .from("user_twilio_credentials")
        .insert({
          user_id: user.id,
          account_sid: credentials.accountSid,
          auth_token: credentials.authToken,
          trunk_sid: trunkResult.trunkSid,
          label: credentials.label,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error saving Twilio credentials:", error);
      throw error;
    }
  }

  /**
   * Update existing Twilio credentials
   */
  static async updateCredentials(
    credentialsId: string, 
    credentials: Partial<TwilioCredentialsInput>
  ): Promise<UserTwilioCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const updateData: any = {};
      if (credentials.accountSid) updateData.account_sid = credentials.accountSid;
      if (credentials.authToken) updateData.auth_token = credentials.authToken;
      if (credentials.label) updateData.label = credentials.label;

      const { data, error } = await supabase
        .from("user_twilio_credentials")
        .update(updateData)
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error updating Twilio credentials:", error);
      throw error;
    }
  }

  /**
   * Delete Twilio credentials
   */
  static async deleteCredentials(credentialsId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_twilio_credentials")
        .delete()
        .eq("id", credentialsId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting Twilio credentials:", error);
      throw error;
    }
  }

  /**
   * Get all Twilio credentials for the current user
   */
  static async getAllCredentials(): Promise<UserTwilioCredentials[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_twilio_credentials")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching all Twilio credentials:", error);
      return [];
    }
  }

  /**
   * Set specific credentials as active
   */
  static async setActiveCredentials(credentialsId: string): Promise<UserTwilioCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, deactivate all credentials for this user
      await supabase
        .from("user_twilio_credentials")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Then activate the specified credentials
      const { data, error } = await supabase
        .from("user_twilio_credentials")
        .update({ is_active: true })
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error setting active Twilio credentials:", error);
      throw error;
    }
  }

  /**
   * Test Twilio credentials by making a simple API call
   */
  static async testCredentials(credentials: TwilioCredentialsInput): Promise<boolean> {
    try {
      // This would make a test API call to Twilio
      // For now, we'll just validate the format
      const accountSidPattern = /^AC[a-f0-9]{32}$/;
      const authTokenPattern = /^[a-f0-9]{32}$/;

      return (
        accountSidPattern.test(credentials.accountSid) &&
        authTokenPattern.test(credentials.authToken)
      );
    } catch (error) {
      console.error("Error testing Twilio credentials:", error);
      return false;
    }
  }
}

// Export convenience functions
export const getActiveTwilioCredentials = () => TwilioCredentialsService.getActiveCredentials();
export const saveTwilioCredentials = (credentials: TwilioCredentialsInput) => 
  TwilioCredentialsService.saveCredentials(credentials);
export const updateTwilioCredentials = (id: string, credentials: Partial<TwilioCredentialsInput>) => 
  TwilioCredentialsService.updateCredentials(id, credentials);
export const deleteTwilioCredentials = (id: string) => TwilioCredentialsService.deleteCredentials(id);
export const getAllTwilioCredentials = () => TwilioCredentialsService.getAllCredentials();
export const setActiveTwilioCredentials = (id: string) => TwilioCredentialsService.setActiveCredentials(id);
export const testTwilioCredentials = (credentials: TwilioCredentialsInput) => 
  TwilioCredentialsService.testCredentials(credentials);
