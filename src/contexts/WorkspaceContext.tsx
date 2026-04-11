import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PagePermissions {
    dashboard: { view: boolean };
    unibox: { view: boolean; manage: boolean };
    agents: { view: boolean; manage: boolean };
    contacts: { view: boolean; manage: boolean };
    workflows: { view: boolean; manage: boolean };
    conversationLogs: { view: boolean; manage: boolean };
    phoneNumbers: { view: boolean; manage: boolean };
    integrations: { view: boolean; manage: boolean };
    settings: { view: boolean; manage: boolean };
}

export const DEFAULT_PAGE_PERMISSIONS: PagePermissions = {
    dashboard: { view: false },
    unibox: { view: false, manage: false },
    agents: { view: false, manage: false },
    contacts: { view: false, manage: false },
    workflows: { view: false, manage: false },
    conversationLogs: { view: false, manage: false },
    phoneNumbers: { view: false, manage: false },
    integrations: { view: false, manage: false },
    settings: { view: false, manage: false },
};

export interface Workspace {
    id: string | null;
    name: string;
    logoUrl?: string;
    description?: string;
    workspace_name: string;
    logo_url?: string | null;
    company_description?: string | null;
    timezone?: string | null;
    company_address?: string | null;
    company_industry?: string | null;
    company_phone?: string | null;
    company_size?: string | null;
    company_website?: string | null;
    created_at: string;
    updated_at: string;
    minutesUsed: number;
    minuteLimit: number;
    isOwner: boolean;
    status: 'active' | 'suspended' | 'pending';
    memberCount: number;
    workspace_type: 'simple' | 'agency' | 'client';
    agency_id?: string | null;
    role: string;
    user_id: string;
    /** Granular page-level permissions set by the workspace owner on invite.
     *  Present only for non-owner members who were invited with custom permissions. */
    permissions?: PagePermissions | null;
}

interface WorkspaceContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    isLoading: boolean;
    totalMinutes: number;
    limitMinutesEnabled: boolean;
    setLimitMinutesEnabled: (enabled: boolean) => void;
    addWorkspace: (workspace: { name: string; description?: string; logoUrl?: string; minuteLimit?: number }) => Promise<void>;
    updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;
    switchWorkspace: (workspace: Workspace) => void;
    refreshWorkspaces: () => Promise<void>;
    canEdit: boolean;
    isOwner: boolean;
    isManager: boolean;
    isMember: boolean;
    isViewer: boolean;
    canViewBilling: boolean;
    canManageBilling: boolean;
    canViewMembers: boolean;
    canManageMembers: boolean;
    canViewAssistants: boolean;
    canCreateAssistants: boolean;
    canManageAssistants: boolean;
    canDeleteAssistants: boolean;
    canViewWorkflows: boolean;
    canCreateWorkflows: boolean;
    canManageWorkflows: boolean;
    canDeploy: boolean;
    canViewCalls: boolean;
    canManageCalls: boolean;
    canViewContacts: boolean;
    canCreateContacts: boolean;
    canManageContacts: boolean;
    canViewCampaigns: boolean;
    canCreateCampaigns: boolean;
    canManageCampaigns: boolean;
    canViewIntegrations: boolean;
    canManageIntegrations: boolean;
    canViewWhitelabel: boolean;
    canManageWhitelabel: boolean;
    canViewSettings: boolean;
    canManageSettings: boolean;
    canManageWorkspace: boolean;
    canViewPhoneNumbers: boolean;
    canManagePhoneNumbers: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);


export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [limitMinutesEnabled, setLimitMinutesEnabled] = useState(false);
    const [totalMinutes, setTotalMinutes] = useState(0);

    const mapWorkspace = (dbWorkspace: any, userId: string, role?: string, permissions?: PagePermissions | null): Workspace => ({
        ...dbWorkspace,
        name: dbWorkspace.workspace_name,
        logoUrl: dbWorkspace.logo_url || undefined,
        description: dbWorkspace.company_description || undefined,
        minutesUsed: dbWorkspace.minutes_used || 0,
        minuteLimit: dbWorkspace.minute_limit || 0,
        isOwner: dbWorkspace.user_id === userId,
        role: role || (dbWorkspace.user_id === userId ? 'owner' : 'member'),
        status: 'active',
        memberCount: dbWorkspace.members?.[0]?.count || 1,
        workspace_type: dbWorkspace.workspace_type || 'simple',
        agency_id: dbWorkspace.agency_id,
        permissions: permissions ?? null,
    });

    const fetchWorkspaces = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsLoading(false);
                return;
            }

            // 1. Get workspaces owned by user
            let { data: ownedData, error: ownedError } = await supabase
                .from('workspace_settings')
                .select('*, members:workspace_members(count)')
                .eq('user_id', user.id);

            if (ownedError) throw ownedError;

            // Auto-create "Main Account" if no owned workspaces exist.
            // Use upsert (onConflict) so concurrent calls from OnboardingComplete
            // never produce duplicate rows.
            if (!ownedData || ownedData.length === 0) {
                const { data: newWorkspace, error: insertError } = await supabase
                    .from('workspace_settings')
                    .upsert(
                        {
                            workspace_name: 'Main Account',
                            user_id: user.id,
                            workspace_type: 'simple'
                        },
                        { onConflict: 'user_id,workspace_name', ignoreDuplicates: true }
                    )
                    .select('*, members:workspace_members(count)')
                    .maybeSingle();

                if (!insertError && newWorkspace) {
                    ownedData = [newWorkspace];
                }
            }

            // 1.5. Get total minutes from Main Account workspace
            const mainAccountWorkspace = ownedData?.find(w => w.workspace_name === 'Main Account');
            if (mainAccountWorkspace?.minute_limit) {
                setTotalMinutes(mainAccountWorkspace.minute_limit);
            }

            // 2. Get workspaces where user is a member (include granular permissions)
            const { data: memberData, error: memberError } = await supabase
                .from('workspace_members')
                .select('workspace_id, role, status, permissions')
                .eq('user_id', user.id);

            if (memberError) throw memberError;

            let sharedData: any[] = [];
            if (memberData && memberData.length > 0) {
                const sharedIds = memberData
                    .map(m => m.workspace_id)
                    .filter(id => !ownedData?.some(o => o.id === id));

                if (sharedIds.length > 0) {
                    const { data, error } = await supabase
                        .from('workspace_settings')
                        .select('*, members:workspace_members(count)')
                        .in('id', sharedIds);

                    if (error) throw error;
                    sharedData = (data || [])
                        .map(w => {
                            const memberInfo = memberData.find(m => m.workspace_id === w.id);
                            return {
                                workspace: w,
                                memberInfo
                            };
                        })
                        .filter(item => item.memberInfo?.status === 'active')
                        .map(item => mapWorkspace(
                            item.workspace,
                            user.id,
                            item.memberInfo?.role,
                            item.memberInfo?.permissions as PagePermissions | null
                        ));
                }
            }

            const ownedMapped = (ownedData || []).map(w => mapWorkspace(w, user.id, 'owner'));
            const mappedInitial = [...ownedMapped, ...sharedData];

            // 3. Get client workspaces for agencies
            const agencyWorkspaceIds = mappedInitial
                .filter(w => w.workspace_type === 'agency' && w.isOwner)
                .map(w => w.id as string);

            let clientWorkspaces: any[] = [];
            if (agencyWorkspaceIds.length > 0) {
                const { data, error } = await supabase
                    .from('workspace_settings')
                    .select('*, members:workspace_members(count)')
                    .in('agency_id', agencyWorkspaceIds);

                if (!error && data) {
                    clientWorkspaces = data.map(w => {
                        const mapped = mapWorkspace(w, user.id, 'owner');
                        return { ...mapped, isOwner: true }; // Treat agency owner as client owner
                    });
                }
            }

            const allWorkspaces = [...mappedInitial, ...clientWorkspaces.filter(cw => !mappedInitial.some(iw => iw.id === cw.id))];

            const mappedWorkspaces = allWorkspaces;
            setWorkspaces(mappedWorkspaces);

            const savedId = localStorage.getItem('current_workspace_id');
            // Support 'null' string or actual null/empty
            let selected = mappedWorkspaces.find(w =>
                w.id === savedId || (savedId === 'null' && w.id === null)
            );

            if (!selected && mappedWorkspaces.length > 0) {
                selected = mappedWorkspaces[0];
            }

            if (selected) {
                setCurrentWorkspace(selected);
                localStorage.setItem('current_workspace_id', String(selected.id));
            }
        } catch (error) {
            console.error('Error fetching workspaces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchWorkspaces();
            } else if (event === 'SIGNED_OUT') {
                setWorkspaces([]);
                setCurrentWorkspace(null);
                localStorage.removeItem('current_workspace_id');
            }
        });

        fetchWorkspaces();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const switchWorkspace = (workspace: Workspace) => {
        setCurrentWorkspace(workspace);
        localStorage.setItem('current_workspace_id', String(workspace.id));
        toast.success(`Switched to ${workspace.name}`);
    };

    const addWorkspace = async (workspace: { name: string; description?: string; logoUrl?: string; minuteLimit?: number }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const isAgency = currentWorkspace?.workspace_type === 'agency';

            const insertData: any = {
                user_id: user.id,
                workspace_name: workspace.name,
                company_description: workspace.description || null,
                logo_url: workspace.logoUrl || null,
                minute_limit: workspace.minuteLimit || 0,
                workspace_type: isAgency ? 'client' : 'simple',
            };

            if (isAgency && currentWorkspace.id) {
                insertData.agency_id = currentWorkspace.id;
            }

            const { data, error } = await supabase
                .from('workspace_settings')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;

            toast.success("Workspace created");
            await fetchWorkspaces();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create workspace");
            throw error;
        }
    };

    const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
        try {
            // Map back to snake_case if necessary
            const dbUpdates: any = { ...updates };
            if (updates.name) dbUpdates.workspace_name = updates.name;
            if (updates.description) dbUpdates.company_description = updates.description;
            if (updates.logoUrl) dbUpdates.logo_url = updates.logoUrl;
            if (updates.minuteLimit !== undefined) dbUpdates.minute_limit = updates.minuteLimit;
            if (updates.minutesUsed !== undefined) dbUpdates.minutes_used = updates.minutesUsed;

            // Clean up UI-only fields
            delete dbUpdates.name;
            delete dbUpdates.description;
            delete dbUpdates.logoUrl;
            delete dbUpdates.minuteLimit;
            delete dbUpdates.minutesUsed;
            delete dbUpdates.isOwner;
            delete dbUpdates.status;
            delete dbUpdates.memberCount;

            const { error } = await supabase
                .from('workspace_settings')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            toast.success("Workspace updated");
            await fetchWorkspaces();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update workspace");
            throw error;
        }
    };

    const deleteWorkspace = async (id: string) => {
        try {
            const { error } = await supabase
                .from('workspace_settings')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Workspace deleted");
            await fetchWorkspaces();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete workspace");
            throw error;
        }
    };

    const role = currentWorkspace?.role || 'viewer';
    const isOwner = role === 'owner';
    const isManager = role === 'admin' || role === 'manager';
    const isMember = role === 'member';
    const isViewer = role === 'viewer';

    // Granular custom permissions — present for invited (non-owner) members
    const customPerms = currentWorkspace?.permissions as PagePermissions | null | undefined;
    // Use custom permissions only when they exist and the user is not the workspace owner
    const hasCustomPerms = !isOwner && !!customPerms;

    const canEdit = isOwner || isManager || (hasCustomPerms
        ? Object.values(customPerms!).some((p: any) => p.manage === true)
        : isMember);

    // Billing/Plans — always role-based (never exposed via custom perms)
    const canViewBilling = isOwner || isManager;
    const canManageBilling = isOwner;

    // Members — part of "Settings" page
    const canViewMembers = isOwner || isManager || (hasCustomPerms ? customPerms!.settings.view : isMember);
    const canManageMembers = isOwner || isManager || (hasCustomPerms ? customPerms!.settings.manage : false);

    // Agents / Assistants
    const canViewAssistants = isOwner || isManager || (hasCustomPerms ? customPerms!.agents.view : isMember || isViewer);
    const canCreateAssistants = isOwner || isManager || (hasCustomPerms ? customPerms!.agents.manage : isMember);
    const canManageAssistants = isOwner || isManager || (hasCustomPerms ? customPerms!.agents.manage : false);
    const canDeleteAssistants = isOwner || isManager || (hasCustomPerms ? customPerms!.agents.manage : false);

    // Workflows
    const canViewWorkflows = isOwner || isManager || (hasCustomPerms ? customPerms!.workflows.view : isMember || isViewer);
    const canCreateWorkflows = isOwner || isManager || (hasCustomPerms ? customPerms!.workflows.manage : isMember);
    const canManageWorkflows = isOwner || isManager || (hasCustomPerms ? customPerms!.workflows.manage : isMember);

    // Deploy to Client
    const canDeploy = isOwner || isManager;

    // Unibox + Conversation Logs both map to calls/convos
    const canViewCalls = isOwner || isManager || (hasCustomPerms
        ? customPerms!.unibox.view || customPerms!.conversationLogs.view
        : isMember);
    const canManageCalls = isOwner || isManager || (hasCustomPerms
        ? customPerms!.unibox.manage || customPerms!.conversationLogs.manage
        : false);

    // Contacts
    const canViewContacts = isOwner || isManager || (hasCustomPerms ? customPerms!.contacts.view : isMember);
    const canCreateContacts = isOwner || isManager || (hasCustomPerms ? customPerms!.contacts.manage : isMember);
    const canManageContacts = isOwner || isManager || (hasCustomPerms ? customPerms!.contacts.manage : false);

    // Campaigns (reuse contacts permission)
    const canViewCampaigns = isOwner || isManager || (hasCustomPerms ? customPerms!.contacts.view : isMember);
    const canCreateCampaigns = isOwner || isManager || (hasCustomPerms ? customPerms!.contacts.manage : isMember);
    const canManageCampaigns = isOwner || isManager || (hasCustomPerms ? customPerms!.contacts.manage : false);

    // Phone Numbers
    const canViewPhoneNumbers = isOwner || isManager || (hasCustomPerms ? customPerms!.phoneNumbers.view : isMember);
    const canManagePhoneNumbers = isOwner || isManager || (hasCustomPerms ? customPerms!.phoneNumbers.manage : false);

    // Integrations
    const canViewIntegrations = isOwner || isManager || (hasCustomPerms ? customPerms!.integrations.view : isMember);
    const canManageIntegrations = isOwner || isManager || (hasCustomPerms ? customPerms!.integrations.manage : false);

    // White Label — always role-based
    const canViewWhitelabel = isOwner || isManager;
    const canManageWhitelabel = isOwner || isManager;

    // Settings
    const canViewSettings = isOwner || isManager || (hasCustomPerms ? customPerms!.settings.view : isMember);
    const canManageSettings = isOwner || isManager || (hasCustomPerms ? customPerms!.settings.manage : false);
    const canManageWorkspace = isOwner || isManager;

    return (
        <WorkspaceContext.Provider value={{
            workspaces,
            currentWorkspace,
            isLoading,
            totalMinutes,
            limitMinutesEnabled,
            setLimitMinutesEnabled,
            addWorkspace,
            updateWorkspace,
            deleteWorkspace,
            switchWorkspace,
            refreshWorkspaces: fetchWorkspaces,
            canEdit,
            isOwner,
            isManager,
            isMember,
            isViewer,
            canViewBilling,
            canManageBilling,
            canViewMembers,
            canManageMembers,
            canViewAssistants,
            canCreateAssistants,
            canManageAssistants,
            canDeleteAssistants,
            canViewWorkflows,
            canCreateWorkflows,
            canManageWorkflows,
            canDeploy,
            canViewCalls,
            canManageCalls,
            canViewContacts,
            canCreateContacts,
            canManageContacts,
            canViewCampaigns,
            canCreateCampaigns,
            canManageCampaigns,
            canViewIntegrations,
            canManageIntegrations,
            canViewWhitelabel,
            canManageWhitelabel,
            canViewSettings,
            canManageSettings,
            canManageWorkspace,
            canViewPhoneNumbers,
            canManagePhoneNumbers,
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider");
    }
    return context;
};
