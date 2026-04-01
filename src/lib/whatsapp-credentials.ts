import { supabase } from "@/integrations/supabase/client";

export interface UserWhatsAppCredentials {
  id: string;
  user_id: string;
  whatsapp_number: string;
  whatsapp_key: string;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppCredentialsInput {
  whatsapp_number: string;
  whatsapp_key: string;
  label: string;
}

/**
 * Service for managing user-specific WhatsApp Business credentials
 */
export class WhatsAppCredentialsService {
  /**
   * Get the active WhatsApp credentials for the current user
   */
  static async getActiveCredentials(): Promise<UserWhatsAppCredentials | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_whatsapp_credentials")
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
      console.error("Error fetching WhatsApp credentials:", error);
      return null;
    }
  }

  /**
   * Save new WhatsApp credentials for the current user
   */
  static async saveCredentials(input: WhatsAppCredentialsInput, workspaceId?: string | null): Promise<UserWhatsAppCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Deactivate existing active credentials scoped to the same workspace
      let deactivateQuery = supabase
        .from("user_whatsapp_credentials")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (workspaceId !== undefined) {
        deactivateQuery = workspaceId === null
          ? deactivateQuery.is("workspace_id", null)
          : deactivateQuery.eq("workspace_id", workspaceId);
      }

      await deactivateQuery;

      // Insert new credentials as active
      const { data, error } = await supabase
        .from("user_whatsapp_credentials")
        .insert({
          user_id: user.id,
          whatsapp_number: input.whatsapp_number,
          whatsapp_key: input.whatsapp_key,
          label: input.label,
          is_active: true,
          workspace_id: workspaceId ?? null
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error saving WhatsApp credentials:", error);
      throw error;
    }
  }

  /**
   * Update existing WhatsApp credentials
   */
  static async updateCredentials(credentialsId: string, input: Partial<WhatsAppCredentialsInput>): Promise<UserWhatsAppCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_whatsapp_credentials")
        .update(input)
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error updating WhatsApp credentials:", error);
      throw error;
    }
  }

  /**
   * Delete WhatsApp credentials
   */
  static async deleteCredentials(credentialsId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_whatsapp_credentials")
        .delete()
        .eq("id", credentialsId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting WhatsApp credentials:", error);
      throw error;
    }
  }

  /**
   * Get all WhatsApp credentials for the current user, optionally filtered by workspace.
   * workspaceId = null → main account (workspace_id IS NULL)
   * workspaceId = string → specific workspace
   * workspaceId = undefined → all credentials (no workspace filter)
   */
  static async getAllCredentials(workspaceId?: string | null): Promise<UserWhatsAppCredentials[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("user_whatsapp_credentials")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (workspaceId !== undefined) {
        query = workspaceId === null
          ? query.is("workspace_id", null)
          : query.eq("workspace_id", workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching all WhatsApp credentials:", error);
      return [];
    }
  }

  /**
   * Set specific credentials as active
   */
  static async setActiveCredentials(credentialsId: string): Promise<UserWhatsAppCredentials> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, deactivate all other credentials
      await supabase
        .from("user_whatsapp_credentials")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Then activate the selected credentials
      const { data, error } = await supabase
        .from("user_whatsapp_credentials")
        .update({ is_active: true })
        .eq("id", credentialsId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error setting active WhatsApp credentials:", error);
      throw error;
    }
  }

  /**
   * Validate WhatsApp credentials format
   */
  static validateCredentials(input: WhatsAppCredentialsInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.whatsapp_number?.trim()) {
      errors.push("WhatsApp number is required");
    } else if (!/^\+[1-9]\d{1,14}$/.test(input.whatsapp_number.trim())) {
      errors.push("WhatsApp number must be in international format (e.g., +1234567890)");
    }

    if (!input.whatsapp_key?.trim()) {
      errors.push("WhatsApp API key is required");
    }

    if (!input.label?.trim()) {
      errors.push("Label is required");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
