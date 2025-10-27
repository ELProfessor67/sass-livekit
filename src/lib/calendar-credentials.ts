import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface UserCalendarCredentials {
  id: string;
  user_id: string;
  provider: string; // 'calcom', 'google', 'outlook', etc.
  api_key: string;
  event_type_id?: string;
  event_type_slug?: string;
  timezone: string;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarCredentialsInput {
  provider: string;
  apiKey: string;
  eventTypeId?: string;
  eventTypeSlug?: string;
  timezone: string;
  label: string;
}

/**
 * Service for managing user-specific calendar credentials
 */
export class CalendarCredentialsService {
  /**
   * Get the active calendar credentials for the current user
   */
  static async getActiveCredentials(): Promise<UserCalendarCredentials | null> {
    try {
      const userId = await getCurrentUserIdAsync();

      const { data, error } = await supabase
        .from("user_calendar_credentials")
        .select("*")
        .eq("user_id", userId)
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
      console.error("Error fetching calendar credentials:", error);
      return null;
    }
  }

  /**
   * Get active calendar credentials by provider
   */
  static async getActiveCredentialsByProvider(provider: string): Promise<UserCalendarCredentials | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_calendar_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", provider)
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
      console.error("Error fetching calendar credentials by provider:", error);
      return null;
    }
  }

  /**
   * Save new calendar credentials for the current user
   */
  static async saveCredentials(credentials: CalendarCredentialsInput): Promise<UserCalendarCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Test credentials before saving (simplified - no event type needed)
      const isValid = await this.testCredentials(credentials);
      if (!isValid) {
        throw new Error("Invalid calendar credentials");
      }

      // Deactivate all existing credentials for this provider
      await supabase
        .from("user_calendar_credentials")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("provider", credentials.provider);

      // Insert new credentials (simplified - no event type fields needed)
      const { data, error } = await supabase
        .from("user_calendar_credentials")
        .insert({
          user_id: user.id,
          provider: credentials.provider,
          api_key: credentials.apiKey,
          event_type_id: null, // Will be set during assistant creation
          event_type_slug: null, // Will be set during assistant creation
          timezone: credentials.timezone,
          label: credentials.label,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error saving calendar credentials:", error);
      throw error;
    }
  }

  /**
   * Update existing calendar credentials
   */
  static async updateCredentials(
    credentialsId: string, 
    credentials: Partial<CalendarCredentialsInput>
  ): Promise<UserCalendarCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const updateData: any = {};
      if (credentials.provider) updateData.provider = credentials.provider;
      if (credentials.apiKey) updateData.api_key = credentials.apiKey;
      if (credentials.eventTypeId) updateData.event_type_id = credentials.eventTypeId;
      if (credentials.eventTypeSlug) updateData.event_type_slug = credentials.eventTypeSlug;
      if (credentials.timezone) updateData.timezone = credentials.timezone;
      if (credentials.label) updateData.label = credentials.label;

      const { data, error } = await supabase
        .from("user_calendar_credentials")
        .update(updateData)
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error updating calendar credentials:", error);
      throw error;
    }
  }

  /**
   * Delete calendar credentials
   */
  static async deleteCredentials(credentialsId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_calendar_credentials")
        .delete()
        .eq("id", credentialsId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting calendar credentials:", error);
      throw error;
    }
  }

  /**
   * Get all calendar credentials for the current user
   */
  static async getAllCredentials(): Promise<UserCalendarCredentials[]> {
    try {
      const userId = await getCurrentUserIdAsync();

      const { data, error } = await supabase
        .from("user_calendar_credentials")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching all calendar credentials:", error);
      return [];
    }
  }

  /**
   * Set specific credentials as active
   */
  static async setActiveCredentials(credentialsId: string): Promise<UserCalendarCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get the provider of the credentials we want to activate
      const { data: credData, error: fetchError } = await supabase
        .from("user_calendar_credentials")
        .select("provider")
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      // Deactivate all credentials for this provider
      await supabase
        .from("user_calendar_credentials")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("provider", credData.provider);

      // Then activate the specified credentials
      const { data, error } = await supabase
        .from("user_calendar_credentials")
        .update({ is_active: true })
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error setting active calendar credentials:", error);
      throw error;
    }
  }

  /**
   * Test calendar credentials by making a simple API call
   */
  static async testCredentials(credentials: CalendarCredentialsInput): Promise<boolean> {
    try {
      if (credentials.provider === 'calcom') {
        // Test Cal.com API key format
        const apiKeyPattern = /^cal_live_[a-f0-9]{32}$|^cal_test_[a-f0-9]{32}$/;
        return apiKeyPattern.test(credentials.apiKey);
      }
      
      // Add other providers as needed
      return true;
    } catch (error) {
      console.error("Error testing calendar credentials:", error);
      return false;
    }
  }

  /**
   * Get available calendar providers
   */
  static getAvailableProviders(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'calcom',
        name: 'Cal.com',
        description: 'Open-source scheduling infrastructure'
      }
    ];
  }
}

// Export convenience functions
export const getActiveCalendarCredentials = () => CalendarCredentialsService.getActiveCredentials();
export const getActiveCalendarCredentialsByProvider = (provider: string) => 
  CalendarCredentialsService.getActiveCredentialsByProvider(provider);
export const saveCalendarCredentials = (credentials: CalendarCredentialsInput) => 
  CalendarCredentialsService.saveCredentials(credentials);
export const updateCalendarCredentials = (id: string, credentials: Partial<CalendarCredentialsInput>) => 
  CalendarCredentialsService.updateCredentials(id, credentials);
export const deleteCalendarCredentials = (id: string) => CalendarCredentialsService.deleteCredentials(id);
export const getAllCalendarCredentials = () => CalendarCredentialsService.getAllCredentials();
export const setActiveCalendarCredentials = (id: string) => CalendarCredentialsService.setActiveCredentials(id);
export const testCalendarCredentials = (credentials: CalendarCredentialsInput) => 
  CalendarCredentialsService.testCredentials(credentials);
