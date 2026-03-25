import { supabase } from "@/integrations/supabase/client";

export interface UserSMTPCredentials {
    id: string;
    user_id: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    smtp_secure: boolean;
    from_email: string;
    from_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface SMTPCredentialsInput {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    smtp_secure: boolean;
    from_email: string;
    from_name?: string;
}

export class SMTPCredentialsService {
    /**
     * Fetch all SMTP credentials for the current user
     */
    static async getCredentials(): Promise<UserSMTPCredentials | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        const { data, error } = await supabase
            .from('user_smtp_credentials')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching SMTP credentials:', error);
            throw error;
        }

        return data;
    }

    /**
     * Save or update SMTP credentials for the current user
     */
    static async saveCredentials(credentials: SMTPCredentialsInput): Promise<UserSMTPCredentials> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        const { data: existing, error: fetchError } = await supabase
            .from('user_smtp_credentials')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from('user_smtp_credentials')
                .update({
                    ...credentials,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from('user_smtp_credentials')
                .insert({
                    user_id: user.id,
                    ...credentials
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }

    /**
     * Delete SMTP credentials
     */
    static async deleteCredentials(id: string): Promise<void> {
        const { error } = await supabase
            .from('user_smtp_credentials')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Validate credentials input
     */
    static validateCredentials(input: SMTPCredentialsInput): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!input.smtp_host) errors.push("SMTP Host is required");
        if (!input.smtp_port) errors.push("SMTP Port is required");
        if (!input.smtp_user) errors.push("SMTP Username is required");
        if (!input.smtp_pass) errors.push("SMTP Password is required");
        if (!input.from_email) errors.push("Sender Email is required");

        // Basic email validation
        if (input.from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.from_email)) {
            errors.push("Invalid sender email format");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
