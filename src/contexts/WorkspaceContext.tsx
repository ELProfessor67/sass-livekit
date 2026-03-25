import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const MAIN_WORKSPACE: Workspace = {
    id: null,
    name: "Main Account",
    workspace_name: "Main Account",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    minutesUsed: 0,
    minuteLimit: 1400,
    isOwner: true,
    status: 'active',
    memberCount: 1,
    workspace_type: 'simple',
    role: 'owner',
    user_id: '', // Will be populated when used
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [limitMinutesEnabled, setLimitMinutesEnabled] = useState(false);
    const [totalMinutes, setTotalMinutes] = useState(0);

    const mapWorkspace = (dbWorkspace: any, userId: string, role?: string): Workspace => ({
        ...dbWorkspace,
        name: dbWorkspace.workspace_name,
        logoUrl: dbWorkspace.logo_url || undefined,
        description: dbWorkspace.company_description || undefined,
        minutesUsed: dbWorkspace.minutes_used || 0,
        minuteLimit: dbWorkspace.minute_limit || 1400,
        isOwner: dbWorkspace.user_id === userId,
        role: role || (dbWorkspace.user_id === userId ? 'owner' : 'member'),
        status: 'active',
        memberCount: dbWorkspace.members?.[0]?.count || 1,
        workspace_type: dbWorkspace.workspace_type || 'simple',
        agency_id: dbWorkspace.agency_id,
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
            const { data: ownedData, error: ownedError } = await supabase
                .from('workspace_settings')
                .select('*, members:workspace_members(count)')
                .eq('user_id', user.id);

            if (ownedError) throw ownedError;

            // 1.5. Get user profile for total minutes
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('minutes_limit')
                .eq('id', user.id)
                .single();

            if (!userError && userData?.minutes_limit) {
                setTotalMinutes(userData.minutes_limit);
            }

            // 2. Get workspaces where user is a member
            const { data: memberData, error: memberError } = await supabase
                .from('workspace_members')
                .select('workspace_id, role, status')
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
                        .map(item => mapWorkspace(item.workspace, user.id, item.memberInfo?.role));
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
            
            // If user has other workspaces and is not an owner, hide the virtual Main Account
            const hasOwned = allWorkspaces.some(w => w.role === 'owner');
            const shouldHideMain = allWorkspaces.length > 0 && !hasOwned;
            
            const mappedWorkspaces = shouldHideMain ? allWorkspaces : [
                { ...MAIN_WORKSPACE, user_id: user.id },
                ...allWorkspaces
            ];
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
                minute_limit: workspace.minuteLimit || 1400,
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

    const canEdit = !isViewer;
    
    // Billing/Plans
    const canViewBilling = isOwner || isManager;
    const canManageBilling = isOwner;
    
    // Members
    const canViewMembers = isOwner || isManager || isMember;
    const canManageMembers = isOwner || isManager;
    
    // Assistants
    const canViewAssistants = isOwner || isManager || isMember || isViewer;
    const canCreateAssistants = isOwner || isManager || isMember;
    const canManageAssistants = isOwner || isManager;
    const canDeleteAssistants = isOwner || isManager;
    
    // Composer (Workflows)
    const canViewWorkflows = isOwner || isManager || isMember || isViewer;
    const canCreateWorkflows = isOwner || isManager || isMember;
    const canManageWorkflows = isOwner || isManager || isMember; // TODO: Implement "Own" restriction
    
    // Deploy to Client
    const canDeploy = isOwner || isManager;
    
    // Calls/Convos
    const canViewCalls = isOwner || isManager || isMember;
    const canManageCalls = isOwner || isManager;
    
    // Contacts
    const canViewContacts = isOwner || isManager || isMember;
    const canCreateContacts = isOwner || isManager || isMember;
    const canManageContacts = isOwner || isManager;
    
    // Campaigns
    const canViewCampaigns = isOwner || isManager || isMember;
    const canCreateCampaigns = isOwner || isManager || isMember;
    const canManageCampaigns = isOwner || isManager;
    
    // Integrations
    const canViewIntegrations = isOwner || isManager || isMember;
    const canManageIntegrations = isOwner || isManager;
    
    // White Label
    const canViewWhitelabel = isOwner || isManager;
    const canManageWhitelabel = isOwner || isManager;
    
    // Workspace Settings
    const canViewSettings = isOwner || isManager || isMember;
    const canManageSettings = isOwner || isManager;
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
            canManageWorkspace
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
