import { supabase } from "@/integrations/supabase/client";

export interface UserSMTPCredentials {
    id: string;
    user_id: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string; // stores SendGrid API key
    smtp_secure: boolean;
    from_email: string;
    from_name: string | null;
    created_at: string;
    updated_at: string;
}

// What the user actually provides for SendGrid
export interface SMTPCredentialsInput {
    api_key: string;       // SendGrid API key — stored in smtp_pass
    from_email: string;
    from_name?: string;
    // Internal DB fields filled with defaults:
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_pass?: string;
    smtp_secure?: boolean;
}

export class SMTPCredentialsService {
    /**
     * Fetch SendGrid credentials for the current user, optionally scoped to a workspace.
     */
    static async getCredentials(workspaceId?: string | null): Promise<UserSMTPCredentials | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        let query = supabase
            .from('user_smtp_credentials')
            .select('*')
            .eq('user_id', user.id);

        if (workspaceId !== undefined) {
            query = workspaceId === null
                ? query.is('workspace_id', null)
                : query.eq('workspace_id', workspaceId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.error('Error fetching SendGrid credentials:', error);
            throw error;
        }

        return data;
    }

    /**
     * Save or update SendGrid credentials for the current user.
     */
    static async saveCredentials(credentials: SMTPCredentialsInput, workspaceId?: string | null): Promise<UserSMTPCredentials> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        // Map SendGrid fields to the DB schema (reuse smtp_pass for the API key)
        const dbRecord = {
            smtp_host: 'api.sendgrid.com',
            smtp_port: 443,
            smtp_user: 'apikey',
            smtp_pass: credentials.api_key,
            smtp_secure: true,
            from_email: credentials.from_email,
            from_name: credentials.from_name ?? null,
        };

        let existingQuery = supabase
            .from('user_smtp_credentials')
            .select('id')
            .eq('user_id', user.id);

        if (workspaceId !== undefined) {
            existingQuery = workspaceId === null
                ? existingQuery.is('workspace_id', null)
                : existingQuery.eq('workspace_id', workspaceId);
        }

        const { data: existing, error: fetchError } = await existingQuery.maybeSingle();
        if (fetchError) throw fetchError;

        if (existing) {
            const { data, error } = await supabase
                .from('user_smtp_credentials')
                .update({ ...dbRecord, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('user_smtp_credentials')
                .insert({ user_id: user.id, workspace_id: workspaceId ?? null, ...dbRecord })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }

    /**
     * Delete SendGrid credentials
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

        if (!input.api_key) errors.push("SendGrid API key is required");
        if (!input.from_email) errors.push("Sender email is required");

        if (input.from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.from_email)) {
            errors.push("Invalid sender email format");
        }

        return { isValid: errors.length === 0, errors };
    }
}
