import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SourceType } from "@/components/composer/SourceBadge";
import { supabase } from "@/integrations/supabase/client";

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'paused';
    category: string;
    nodes: any[];
    edges: any[];
    completed_count: number;
    failed_count: number;
    is_template: boolean;
    created_at: string;
    updated_at: string;
    // New multi-tenant fields
    source_type: SourceType;
    source_template_name?: string;
    deployed_by?: string; // Agency name if deployed
    folder_id?: string;
    folder_name?: string;
    account_id: string; // Which client account this belongs to
    account_name?: string; // For agency view
    is_starter: boolean;
    assistant_id?: string | null;
    is_active?: boolean;
}

// Mock data removed to ensure UI shows real data from Supabase
const mockWorkflows: Workflow[] = [];
const mockClientAccounts: any[] = [];

export interface WorkflowFilters {
    status?: 'draft' | 'active' | 'paused';
    accountId?: string;
    folderId?: string;
    sourceType?: SourceType;
}

export function useWorkflows(filters?: WorkflowFilters) {
    const queryClient = useQueryClient();

    const { data: workflows, isLoading } = useQuery({
        queryKey: ['workflows', filters],
        queryFn: async () => {
            let query = (supabase as any)
                .from('workflows')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.accountId) query = query.eq('account_id', filters.accountId);
            if (filters?.folderId) query = query.eq('folder_id', filters.folderId);
            if (filters?.sourceType) query = query.eq('source_type', filters.sourceType);

            const { data, error } = await query;
            if (error) throw error;
            return data as Workflow[];
        }
    });

    const createWorkflow = useMutation({
        mutationFn: async (workflow: Partial<Workflow>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await (supabase as any)
                .from('workflows')
                .insert({
                    user_id: user.id,
                    name: workflow.name || 'New Workflow',
                    description: workflow.description,
                    status: workflow.status || 'draft',
                    category: workflow.category || 'unsorted',
                    nodes: workflow.nodes || [],
                    edges: workflow.edges || [],
                    source_type: workflow.source_type || 'scratch',
                    is_starter: workflow.is_starter || false,
                })
                .select()
                .single();

            if (error) throw error;
            return data as Workflow;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }
    });

    const updateWorkflow = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Workflow> & { id: string }) => {
            const { data, error } = await (supabase as any)
                .from('workflows')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Workflow;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }
    });

    const deleteWorkflow = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('workflows')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }
    });

    const stats = {
        total: workflows?.length || 0,
        active: workflows?.filter((w) => w.status === 'active').length || 0,
        draft: workflows?.filter((w) => w.status === 'draft').length || 0,
        paused: workflows?.filter((w) => w.status === 'paused').length || 0,
        starter: workflows?.filter((w) => w.is_starter).length || 0,
    };

    return {
        workflows,
        isLoading,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        stats,
    };
}

export function useClientAccounts() {
    const { data: clients, isLoading } = useQuery({
        queryKey: ['client-accounts'],
        queryFn: async () => {
            return mockClientAccounts;
        }
    });
    return { clients, isLoading };
}
