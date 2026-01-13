import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkflowFolder {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    workflow_count: number;
    created_at: string;
    updated_at: string;
}

const mockFolders: WorkflowFolder[] = [];

export function useWorkflowFolders() {
    const queryClient = useQueryClient();

    const { data: folders, isLoading } = useQuery({
        queryKey: ['workflow-folders'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('workflow_folders')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data as WorkflowFolder[];
        }
    });

    const createFolder = useMutation({
        mutationFn: async (data: { name: string; color?: string; icon?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: folder, error } = await (supabase as any)
                .from('workflow_folders')
                .insert({
                    user_id: user.id,
                    name: data.name,
                    color: data.color,
                    icon: data.icon,
                })
                .select()
                .single();

            if (error) throw error;
            return folder as WorkflowFolder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] });
        }
    });

    const updateFolder = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<WorkflowFolder> & { id: string }) => {
            const { data, error } = await (supabase as any)
                .from('workflow_folders')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as WorkflowFolder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] });
        }
    });

    const deleteFolder = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('workflow_folders')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] });
        }
    });

    const totalWorkflowCount = folders?.reduce((sum, f) => sum + f.workflow_count, 0) || 0;

    return {
        folders,
        isLoading,
        createFolder,
        updateFolder,
        deleteFolder,
        totalWorkflowCount,
    };
}
