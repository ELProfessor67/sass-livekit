import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_CONFIGS, getMinutesLimitForPlan, getPlanConfig, getPlanConfigs, invalidatePlanConfigsCache, type PlanConfig } from "@/lib/plan-config";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Edit, Trash2, Eye, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/SupportAccessAuthContext';
import DashboardLayout from '@/layout/DashboardLayout';
import { ThemeContainer, ThemeSection, ThemeCard } from '@/components/theme';
import { SupportAccessDialog } from '@/components/admin/SupportAccessDialog';
import { SupportAccessBanner } from '@/components/admin/SupportAccessBanner';
import { ActiveSupportSessions } from '@/components/admin/ActiveSupportSessions';

interface User {
  id: string;
  name: string | null;
  contact: {
    email: string | null;
    phone: string | null;
    countryCode: string | null;
  } | null;
  role: string | null;
  is_active: boolean | null;
  created_on: string | null;
  updated_at: string | null;
  company: string | null;
  industry: string | null;
  plan?: string | null;
  minutes_limit?: number | null;
  minutes_used?: number | null;
  is_whitelabel?: boolean;
  slug_name?: string | null;
  tenant?: string | null;
}

interface UserStats {
  totalAssistants: number;
  totalCalls: number;
  totalHours: number;
  totalMessages: number;
  plan: string | null;
}


const AdminPanel = () => {
  const { user, isImpersonating, exitImpersonation, activeSupportSession: contextActiveSupportSession, startSupportAccess } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [allUserStats, setAllUserStats] = useState<Record<string, UserStats>>({});
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planDialogUser, setPlanDialogUser] = useState<User | null>(null);
  const [planDialogPlan, setPlanDialogPlan] = useState<string>("free");
  const [planDialogMinutesLimit, setPlanDialogMinutesLimit] = useState<number>(getMinutesLimitForPlan("free"));
  const [planDialogMinutesUsed, setPlanDialogMinutesUsed] = useState<number>(0);
  const [planDialogLoading, setPlanDialogLoading] = useState(false);
  
  // Plan configuration management state
  const [planConfigs, setPlanConfigs] = useState<Record<string, PlanConfig>>({});
  const [loadingPlanConfigs, setLoadingPlanConfigs] = useState(false);
  const [editingPlanKey, setEditingPlanKey] = useState<string | null>(null);
  const [editPlanData, setEditPlanData] = useState<Partial<PlanConfig>>({});
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [adminMinutesLimit, setAdminMinutesLimit] = useState<number | null>(null);
  
  // Get effective minutes limit (from DB or calculate from plan)
  const getEffectiveMinutesLimit = (user: User): number => {
    // If minutes_limit exists in DB, use it
    if (user.minutes_limit !== null && user.minutes_limit !== undefined) {
      return user.minutes_limit;
    }
    // Otherwise, calculate from plan
    return getMinutesLimitForPlan(user.plan);
  };

  const formatMinutes = (value?: number | null, plan?: string | null) => {
    // If value is null, try to get from plan
    if (value === null || value === undefined) {
      if (plan) {
        const planMinutes = getMinutesLimitForPlan(plan);
        if (planMinutes === 0) return 'Unlimited';
        return `${planMinutes.toLocaleString()} min`;
      }
      return '—';
    }
    if (value === 0) return 'Unlimited';
    return `${value.toLocaleString()} min`;
  };

  const getRemainingMinutes = (user: User) => {
    const limit = getEffectiveMinutesLimit(user);
    if (limit === 0) return 'Unlimited';
    const used = user.minutes_used || 0;
    const remaining = Math.max(limit - used, 0);
    return `${remaining.toLocaleString()} min`;
  };

  const getUsageStatus = (user: User) => {
    const limit = getEffectiveMinutesLimit(user);
    if (limit === 0) return 'Unlimited';
    const used = user.minutes_used || 0;
    const percentage = (used / limit) * 100;
    if (used >= limit) return 'Exceeded';
    if (percentage >= 90) return 'Critical';
    if (percentage >= 75) return 'Warning';
    return 'OK';
  };
  const formatPlanName = (plan?: string | null) => {
    if (!plan) return 'Free';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Exceeded':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      case 'Critical':
        return 'bg-orange-500/15 text-orange-500 border-orange-500/20';
      case 'Warning':
        return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/20';
      case 'Unlimited':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20';
      case 'OK':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };
  const openPlanDialog = (user: User) => {
    setPlanDialogUser(user);
    const userPlan = user.plan || "free";
    setPlanDialogPlan(userPlan);
    setPlanDialogMinutesLimit(user.minutes_limit ?? getMinutesLimitForPlan(userPlan));
    setPlanDialogMinutesUsed(user.minutes_used ?? 0);
    setPlanDialogOpen(true);
  };

  const handlePlanDialogPlanChange = (planKey: string) => {
    setPlanDialogPlan(planKey);
    const defaultMinutes = getMinutesLimitForPlan(planKey);
    setPlanDialogMinutesLimit(defaultMinutes);
  };

  const handlePlanSave = async () => {
    if (!planDialogUser) return;
    setPlanDialogLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          plan: planDialogPlan,
          minutes_limit: planDialogMinutesLimit,
          minutes_used: planDialogMinutesUsed,
        })
        .eq("id", planDialogUser.id);

      if (error) throw error;

      toast.success(`Updated plan for ${planDialogUser.name || planDialogUser.contact?.email || 'user'}`);
      setPlanDialogOpen(false);
      setPlanDialogUser(null);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast.error(error?.message || "Failed to update plan");
    } finally {
      setPlanDialogLoading(false);
    }
  };
  
  // Support Access state
  const [activeSupportSession, setActiveSupportSession] = useState<any>(null);
  const [showActiveSessions, setShowActiveSessions] = useState(false);

  // Check if current user is admin OR if we're in a support access session
  const isAdmin = user?.role === 'admin' || contextActiveSupportSession;
  
  // Debug logging
  console.log('AdminPanel Debug:', {
    userRole: user?.role,
    contextActiveSupportSession: contextActiveSupportSession,
    isAdmin: isAdmin,
    isImpersonating: isImpersonating
  });

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchUsers();
    fetchPlanConfigs();
  }, [isAdmin]);

  // Fetch plan configurations from database
  const fetchPlanConfigs = async () => {
    try {
      setLoadingPlanConfigs(true);
      // Get current user's tenant to fetch appropriate plans
      let tenant: string | null = null;
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('slug_name')
          .eq('id', user.id)
          .single();
        tenant = userData?.slug_name || null;
      }
      const configs = await getPlanConfigs(tenant);
      setPlanConfigs(configs);
    } catch (error: any) {
      console.error('Error fetching plan configs:', error);
      toast.error('Failed to load plan configurations');
    } finally {
      setLoadingPlanConfigs(false);
    }
  };

  // Open edit plan dialog
  const openEditPlanDialog = async (planKey: string) => {
    const plan = planConfigs[planKey] || PLAN_CONFIGS[planKey];
    if (plan) {
      setEditingPlanKey(planKey);
      setEditPlanData({
        key: plan.key,
        name: plan.name,
        price: plan.price,
        minutesLimit: plan.minutesLimit,
        features: [...plan.features]
      });
      
      // Get admin's minutes limit for validation
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('slug_name, minutes_limit')
          .eq('id', user.id)
          .single();
        
        if (userData?.slug_name) {
          // White label admin - get their minutes limit
          setAdminMinutesLimit(userData.minutes_limit || 0);
        } else {
          // Main tenant admin - no limit
          setAdminMinutesLimit(null);
        }
      } else {
        setAdminMinutesLimit(null);
      }
      
      setIsEditPlanOpen(true);
    }
  };

  // Save plan configuration
  const handleSavePlan = async () => {
    if (!editingPlanKey) return;

    try {
      setLoadingPlanConfigs(true);
      
      // Get current user's tenant (slug_name for whitelabel admins, null for main tenant admin)
      let tenant: string | null = null;
      let adminMinutes: number = 0;
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('slug_name, tenant, minutes_limit')
          .eq('id', user.id)
          .single();
        
        // If user has slug_name, they're a whitelabel admin - use their slug as tenant
        // Otherwise, they're main tenant admin - use null
        tenant = userData?.slug_name || null;
        adminMinutes = userData?.minutes_limit || 0;
      }
      
      // Validate minutes limit for white label admins
      if (tenant) {
        // If admin has unlimited minutes (0), allow any plan configuration
        if (adminMinutes === 0) {
          // Admin with unlimited can create any plan config, including unlimited
          // No validation needed
        } else if (adminMinutes > 0) {
          // Get all plan configs for this tenant (excluding the one being edited)
          const { data: existingPlans } = await supabase
            .from('plan_configs')
            .select('plan_key, minutes_limit')
            .eq('tenant', tenant)
            .neq('plan_key', editingPlanKey); // Exclude the plan being edited
          
          // Calculate current total minutes across all plans
          const currentTotal = (existingPlans || []).reduce((sum, plan) => {
            const planMinutes = plan.minutes_limit || 0;
            // Only count limited plans (exclude unlimited/0)
            return planMinutes > 0 ? sum + planMinutes : sum;
          }, 0);
          
          // Get the new minutes for the plan being edited
          // Check explicitly for 0 (unlimited), not just falsy values
          const newPlanMinutes = editPlanData.minutesLimit !== undefined && editPlanData.minutesLimit !== null 
            ? editPlanData.minutesLimit 
            : 0;
          
          // Prevent setting plan to unlimited (0) unless admin also has unlimited
          if (newPlanMinutes === 0 && adminMinutes > 0) {
            toast.error(`Cannot set plan to unlimited minutes. You have a limited plan (${adminMinutes.toLocaleString()} minutes). Only admins with unlimited plans can create unlimited plan configurations.`);
            setLoadingPlanConfigs(false);
            return;
          }
          
          // Calculate new total
          const newTotal = currentTotal + newPlanMinutes;
          
          // Validate: new total cannot exceed admin's minutes
          if (newTotal > adminMinutes) {
            const available = adminMinutes - currentTotal;
            toast.error(
              `Cannot set plan minutes to ${newPlanMinutes}. ` +
              `Available: ${available} minutes ` +
              `(You have ${adminMinutes} total, ${currentTotal} already allocated across other plans). ` +
              `The sum of all plan configuration minutes cannot exceed your plan minutes.`
            );
            setLoadingPlanConfigs(false);
            return;
          }
        }
      }
      
      // Check if plan exists for this tenant
      let existingPlanQuery = supabase
        .from('plan_configs')
        .select('id, tenant, minutes_limit')
        .eq('plan_key', editingPlanKey);
      
      if (tenant) {
        // For whitelabel admin, check for their tenant-specific plan
        existingPlanQuery = existingPlanQuery.eq('tenant', tenant);
      } else {
        // For main tenant admin, check for main tenant plan (tenant IS NULL)
        existingPlanQuery = existingPlanQuery.is('tenant', null);
      }
      
      const { data: existingPlan } = await existingPlanQuery.maybeSingle();
      
      const updateData: any = {
        name: editPlanData.name,
        price: editPlanData.price,
        minutes_limit: editPlanData.minutesLimit,
        features: editPlanData.features || [],
        tenant: tenant // Set tenant for whitelabel admins
      };
      
      if (existingPlan) {
        // Update existing plan
        let updateQuery = supabase
          .from('plan_configs')
          .update(updateData)
          .eq('plan_key', editingPlanKey);
        
        if (tenant) {
          // For whitelabel admin, update their tenant-specific plan
          updateQuery = updateQuery.eq('tenant', tenant);
        } else {
          // For main tenant admin, update main tenant plan (tenant IS NULL)
          updateQuery = updateQuery.is('tenant', null);
        }
        
        const { error } = await updateQuery;
        if (error) throw error;
      } else {
        // Create new tenant-specific plan (for whitelabel admins)
        // Main tenant plans should already exist, but create if missing
        const { error } = await supabase
          .from('plan_configs')
          .insert({
            plan_key: editingPlanKey,
            ...updateData
          });
        
        if (error) throw error;
      }

      // Invalidate cache and refetch
      invalidatePlanConfigsCache();
      await fetchPlanConfigs();
      
      toast.success(tenant 
        ? 'Your tenant plan updated successfully!' 
        : 'Plan updated successfully!');
      setIsEditPlanOpen(false);
      setEditingPlanKey(null);
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast.error(error?.message || 'Failed to save plan configuration');
    } finally {
      setLoadingPlanConfigs(false);
    }
  };

  useEffect(() => {
    const filtered = users.filter(user => 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const filteredPlanUsers = useMemo(() => {
    if (!planSearchTerm) return users;
    const term = planSearchTerm.toLowerCase();
    return users.filter(user => 
      user.name?.toLowerCase().includes(term) ||
      user.contact?.email?.toLowerCase().includes(term) ||
      user.plan?.toLowerCase().includes(term)
    );
  }, [users, planSearchTerm]);

  // Debug userStats changes
  useEffect(() => {
    console.log('🔄 userStats state changed:', userStats);
  }, [userStats]);

  // Auto-load user statistics when modal opens
  useEffect(() => {
    if (isViewUserOpen && selectedUser) {
      console.log('🔄 Modal opened, auto-loading stats for user:', selectedUser.id);
      fetchUserStats(selectedUser.id);
    }
  }, [isViewUserOpen, selectedUser]);

  // Reset userStats when modal closes
  useEffect(() => {
    if (!isViewUserOpen) {
      setUserStats(null);
      setLoadingStats(false);
    }
  }, [isViewUserOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Alternative implementation: Single API call to backend
      // Backend fetches from auth.users first, then enriches with users table data
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session found. Please log in again.');
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      const response = await fetch(`${backendUrl}/api/v1/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Data is already complete with emails merged from auth.users
        // Backend has already:
        // 1. Fetched from auth.users (has emails)
        // 2. Fetched from users table (has profile data)
        // 3. Merged them together
        setUsers(result.data);
        
        // Fetch stats for all users
        await fetchAllUserStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUserStats = async (users: User[]) => {
    try {
      const statsPromises = users.map(async (user) => {
        try {
          // Fetch assistants count
          const { data: assistantsData, error: assistantsError } = await supabase
            .from('assistant')
            .select('id')
            .eq('user_id', user.id);

          if (assistantsError) {
            console.error(`Error fetching assistants for user ${user.id}:`, assistantsError);
            return {
              userId: user.id,
              stats: {
                totalAssistants: 0,
                totalCalls: 0,
                totalHours: 0,
                totalMessages: 0,
                plan: user.plan || 'Free'
              }
            };
          }

          // Fetch calls count
          const { data: callsData, error: callsError } = await supabase
            .from('call_history')
            .select('id')
            .in('assistant_id', assistantsData?.map(a => a.id) || []);

          if (callsError) {
            console.error(`Error fetching calls for user ${user.id}:`, callsError);
            // Continue with 0 calls
          }

          // Fetch SMS messages count
          const { data: messagesData, error: messagesError } = await supabase
            .from('sms_messages')
            .select('id')
            .eq('user_id', user.id);

          if (messagesError) {
            console.error(`Error fetching messages for user ${user.id}:`, messagesError);
            // Continue with 0 messages
          }

          return {
            userId: user.id,
            stats: {
              totalAssistants: assistantsData?.length || 0,
              totalCalls: callsData?.length || 0,
              totalHours: 0, // We'll calculate this separately if needed
              totalMessages: messagesData?.length || 0,
              plan: user.plan || 'Free'
            }
          };
        } catch (error) {
          console.error(`Error fetching stats for user ${user.id}:`, error);
          return {
            userId: user.id,
            stats: {
              totalAssistants: 0,
              totalCalls: 0,
              totalHours: 0,
              totalMessages: 0,
              plan: user.plan || 'Free'
            }
          };
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap: Record<string, UserStats> = {};
      results.forEach(({ userId, stats }) => {
        statsMap[userId] = stats;
      });
      
      setAllUserStats(statsMap);
    } catch (error) {
      console.error('Error fetching all user stats:', error);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      setLoadingStats(true);
      console.log('🔍 Fetching stats for user:', userId);
      
      // Fetch assistants count
      const { data: assistantsData, error: assistantsError } = await supabase
        .from('assistant')
        .select('id')
        .eq('user_id', userId);

      console.log('📊 Assistants data:', assistantsData, 'Error:', assistantsError);

      if (assistantsError) {
        console.error('Error fetching assistants:', assistantsError);
        // Continue with empty assistants array
      }

      const assistantIds = assistantsData?.map(a => a.id) || [];
      console.log('🆔 Assistant IDs:', assistantIds);

      // Fetch calls count and total duration
      let callsData = [];
      let callsError = null;
      if (assistantIds.length > 0) {
        const callsResult = await supabase
          .from('call_history')
          .select('call_duration')
          .in('assistant_id', assistantIds);
        
        callsData = callsResult.data || [];
        callsError = callsResult.error;
        
        console.log('📞 Calls data:', callsData, 'Error:', callsError);
        
        if (callsError) {
          console.error('Error fetching calls:', callsError);
        }
      } else {
        console.log('📞 No assistants found, skipping calls query');
      }

      // Fetch SMS messages count
      const { data: messagesData, error: messagesError } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('user_id', userId);

      console.log('💬 Messages data:', messagesData, 'Error:', messagesError);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        // Continue with empty messages array
      }

      // Calculate total hours from call duration (duration is in seconds)
      const totalSeconds = callsData?.reduce((sum, call) => sum + (call.call_duration || 0), 0) || 0;
      const totalHours = Math.round((totalSeconds / 3600) * 100) / 100; // Round to 2 decimal places

      // Get user plan (skip if column doesn't exist)
      let userPlan = 'Free';
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('plan')
          .eq('id', userId)
          .single();

        console.log('👤 User plan data:', userData, 'Error:', userError);

        if (!userError && userData?.plan) {
          userPlan = userData.plan;
        }
      } catch (planError) {
        console.log('📋 Plan column not available, using default:', planError.message);
        // Plan column doesn't exist, use default
      }

      const stats = {
        totalAssistants: assistantsData?.length || 0,
        totalCalls: callsData?.length || 0,
        totalHours: totalHours,
        totalMessages: messagesData?.length || 0,
        plan: userPlan
      };

      console.log('✅ Final stats:', stats);
      console.log('🔄 Setting userStats state...');
      setUserStats(stats);
      console.log('✅ userStats state set successfully');
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      toast.error(`Failed to fetch user statistics: ${error.message}`);
      setUserStats(null);
    } finally {
      setLoadingStats(false);
    }
  };


  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(editUserData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditUserOpen(false);
      setSelectedUser(null);
      setEditUserData({});
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const userId = selectedUser.id;
      let deletedCounts = {
        assistants: 0,
        campaigns: 0,
        contacts: 0,
        contactLists: 0,
        csvFiles: 0,
        csvContacts: 0,
        smsMessages: 0,
        knowledgeBases: 0,
        calendarCredentials: 0,
        whatsappCredentials: 0,
        twilioCredentials: 0,
        workspaceSettings: 0
      };

      // Delete assistants first
      const { data: assistants, error: assistantsError } = await supabase
        .from('assistant')
        .select('id')
        .eq('user_id', userId);

      if (assistantsError) throw assistantsError;

      if (assistants && assistants.length > 0) {
        const { error: deleteAssistantsError } = await supabase
          .from('assistant')
          .delete()
          .eq('user_id', userId);

        if (deleteAssistantsError) throw deleteAssistantsError;
        deletedCounts.assistants = assistants.length;
      }

      // Delete campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId);

      if (campaignsError) throw campaignsError;

      if (campaigns && campaigns.length > 0) {
        const { error: deleteCampaignsError } = await supabase
          .from('campaigns')
          .delete()
          .eq('user_id', userId);

        if (deleteCampaignsError) throw deleteCampaignsError;
        deletedCounts.campaigns = campaigns.length;
      }

      // Delete contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId);

      if (contactsError) throw contactsError;

      if (contacts && contacts.length > 0) {
        const { error: deleteContactsError } = await supabase
          .from('contacts')
          .delete()
          .eq('user_id', userId);

        if (deleteContactsError) throw deleteContactsError;
        deletedCounts.contacts = contacts.length;
      }

      // Delete contact lists
      const { data: contactLists, error: contactListsError } = await supabase
        .from('contact_lists')
        .select('id')
        .eq('user_id', userId);

      if (contactListsError) throw contactListsError;

      if (contactLists && contactLists.length > 0) {
        const { error: deleteContactListsError } = await supabase
          .from('contact_lists')
          .delete()
          .eq('user_id', userId);

        if (deleteContactListsError) throw deleteContactListsError;
        deletedCounts.contactLists = contactLists.length;
      }

      // Delete CSV files
      const { data: csvFiles, error: csvFilesError } = await supabase
        .from('csv_files')
        .select('id')
        .eq('user_id', userId);

      if (csvFilesError) throw csvFilesError;

      if (csvFiles && csvFiles.length > 0) {
        const { error: deleteCsvFilesError } = await supabase
          .from('csv_files')
          .delete()
          .eq('user_id', userId);

        if (deleteCsvFilesError) throw deleteCsvFilesError;
        deletedCounts.csvFiles = csvFiles.length;
      }

      // Delete CSV contacts
      const { data: csvContacts, error: csvContactsError } = await supabase
        .from('csv_contacts')
        .select('id')
        .eq('user_id', userId);

      if (csvContactsError) throw csvContactsError;

      if (csvContacts && csvContacts.length > 0) {
        const { error: deleteCsvContactsError } = await supabase
          .from('csv_contacts')
          .delete()
          .eq('user_id', userId);

        if (deleteCsvContactsError) throw deleteCsvContactsError;
        deletedCounts.csvContacts = csvContacts.length;
      }

      // Delete SMS messages
      const { data: smsMessages, error: smsMessagesError } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('user_id', userId);

      if (smsMessagesError) throw smsMessagesError;

      if (smsMessages && smsMessages.length > 0) {
        const { error: deleteSmsMessagesError } = await supabase
          .from('sms_messages')
          .delete()
          .eq('user_id', userId);

        if (deleteSmsMessagesError) throw deleteSmsMessagesError;
        deletedCounts.smsMessages = smsMessages.length;
      }

      // Delete knowledge bases
      const { data: knowledgeBases, error: knowledgeBasesError } = await supabase
        .from('knowledge_bases')
        .select('id')
        .eq('company_id', userId);

      if (knowledgeBasesError) throw knowledgeBasesError;

      if (knowledgeBases && knowledgeBases.length > 0) {
        const { error: deleteKnowledgeBasesError } = await supabase
          .from('knowledge_bases')
          .delete()
          .eq('company_id', userId);

        if (deleteKnowledgeBasesError) throw deleteKnowledgeBasesError;
        deletedCounts.knowledgeBases = knowledgeBases.length;
      }

      // Delete calendar credentials
      const { data: calendarCredentials, error: calendarCredentialsError } = await supabase
        .from('user_calendar_credentials')
        .select('id')
        .eq('user_id', userId);

      if (calendarCredentialsError) throw calendarCredentialsError;

      if (calendarCredentials && calendarCredentials.length > 0) {
        const { error: deleteCalendarCredentialsError } = await supabase
          .from('user_calendar_credentials')
          .delete()
          .eq('user_id', userId);

        if (deleteCalendarCredentialsError) throw deleteCalendarCredentialsError;
        deletedCounts.calendarCredentials = calendarCredentials.length;
      }

      // Delete WhatsApp credentials
      const { data: whatsappCredentials, error: whatsappCredentialsError } = await supabase
        .from('user_whatsapp_credentials')
        .select('id')
        .eq('user_id', userId);

      if (whatsappCredentialsError) throw whatsappCredentialsError;

      if (whatsappCredentials && whatsappCredentials.length > 0) {
        const { error: deleteWhatsappCredentialsError } = await supabase
          .from('user_whatsapp_credentials')
          .delete()
          .eq('user_id', userId);

        if (deleteWhatsappCredentialsError) throw deleteWhatsappCredentialsError;
        deletedCounts.whatsappCredentials = whatsappCredentials.length;
      }

      // Delete Twilio credentials
      const { data: twilioCredentials, error: twilioCredentialsError } = await supabase
        .from('user_twilio_credentials')
        .select('id')
        .eq('user_id', userId);

      if (twilioCredentialsError) throw twilioCredentialsError;

      if (twilioCredentials && twilioCredentials.length > 0) {
        const { error: deleteTwilioCredentialsError } = await supabase
          .from('user_twilio_credentials')
          .delete()
          .eq('user_id', userId);

        if (deleteTwilioCredentialsError) throw deleteTwilioCredentialsError;
        deletedCounts.twilioCredentials = twilioCredentials.length;
      }

      // Delete workspace settings
      const { data: workspaceSettings, error: workspaceSettingsError } = await supabase
        .from('workspace_settings')
        .select('id')
        .eq('user_id', userId);

      if (workspaceSettingsError) throw workspaceSettingsError;

      if (workspaceSettings && workspaceSettings.length > 0) {
        const { error: deleteWorkspaceSettingsError } = await supabase
          .from('workspace_settings')
          .delete()
          .eq('user_id', userId);

        if (deleteWorkspaceSettingsError) throw deleteWorkspaceSettingsError;
        deletedCounts.workspaceSettings = workspaceSettings.length;
      }

      // Finally, delete the user from both auth.users and public.users via backend API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session found. Please log in again.');
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      const deleteResponse = await fetch(`${backendUrl}/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({ error: 'Failed to delete user' }));
        throw new Error(errorData.error || 'Failed to delete user');
      }

      const deleteResult = await deleteResponse.json();
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete user');
      }

      // Create success message with details
      const deletedItems = Object.entries(deletedCounts)
        .filter(([_, count]) => count > 0)
        .map(([item, count]) => `${count} ${item}`)
        .join(', ');

      const successMessage = deletedItems 
        ? `User deleted successfully along with: ${deletedItems}`
        : 'User deleted successfully';

      toast.success(successMessage);
      setIsDeleteUserOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      // Provide more specific error messages
      if (error.code === '23503') {
        toast.error('Cannot delete user: User still has associated data. Please contact support.');
      } else if (error.message?.includes('not_admin')) {
        toast.error('Access denied: Admin privileges required to delete users.');
      } else {
        toast.error(error.message || 'Failed to delete user');
      }
    }
  };



  // Support Access handlers
  const handleSupportAccess = async (sessionData: any) => {
    try {
      // Use the startSupportAccess function from the context
      const result = await startSupportAccess(sessionData);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error starting support access:', error);
      toast.error('Failed to start support access');
    }
  };

  const handleEndSupportSession = async () => {
    if (!contextActiveSupportSession) return;

    try {
      // Get the current session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('No valid session found. Please log in again.');
        return;
      }

      const response = await fetch(`/api/v1/support-access/support-sessions/${contextActiveSupportSession.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to end support session');
      }

      setActiveSupportSession(null);
      await exitImpersonation();
      toast.success('Support access session ended');
    } catch (error) {
      console.error('Error ending support session:', error);
      toast.error('Failed to end support session');
    }
  };

  const handleExitImpersonation = async () => {
    setActiveSupportSession(null);
    await exitImpersonation();
  };

  const handleSessionSelect = (session: any) => {
    setActiveSupportSession(session);
    // You could also start impersonation here if needed
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      name: user.name,
      role: user.role,
      company: user.company,
      industry: user.industry,
      is_active: user.is_active
    });
    setIsEditUserOpen(true);
  };

  const openViewDialog = (user: User) => {
    setSelectedUser(user);
    setIsViewUserOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen flex items-center justify-center">
          <ThemeCard className="w-96">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access this panel.
              </CardDescription>
            </CardHeader>
          </ThemeCard>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-7xl mx-auto">
            <ThemeSection spacing="lg">
              <div className="flex flex-col space-y-[var(--space-md)]">
                <h1 className="text-[28px] font-light tracking-[0.2px] text-foreground">
                  Admin Panel
                </h1>
                <p className="text-muted-foreground text-sm font-medium tracking-[0.1px]">
                  Manage users and system administration
                </p>
              </div>
            </ThemeSection>

            {/* Active Support Sessions */}
            {!isImpersonating && (
              <div className="mb-6">
                <ActiveSupportSessions onSessionSelect={handleSessionSelect} />
              </div>
            )}

            <Tabs defaultValue="users" className="w-full">
              <TabsList className="mb-6 flex w-full flex-col gap-2 sm:flex-row">
                <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
                <TabsTrigger value="plans" className="flex-1">Plans & Minutes</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-0">
                <ThemeCard>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Users Management</CardTitle>
                        <CardDescription>
                          View and manage all system users
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-64"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>White Label</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Assistants</TableHead>
                        <TableHead>Calls</TableHead>
                        <TableHead>Total Minutes</TableHead>
                        <TableHead>Used Minutes</TableHead>
                        <TableHead>Remaining Minutes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                          <TableCell>{user.contact?.email || 'N/A'}</TableCell>
                          <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role || 'user'}
                          </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_whitelabel ? 'default' : 'outline'}>
                              {user.is_whitelabel ? 'Yes' : 'No'}
                            </Badge>
                            {user.is_whitelabel && user.slug_name && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({user.slug_name})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {allUserStats[user.id]?.plan || user.plan || 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-blue-400">
                              {allUserStats[user.id]?.totalAssistants || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-green-400">
                              {allUserStats[user.id]?.totalCalls || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-blue-400">
                              {formatMinutes(user.minutes_limit, user.plan)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-orange-400">
                              {user.minutes_used?.toLocaleString() || 0} min
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-emerald-400">
                              {getRemainingMinutes(user)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openViewDialog(user)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <SupportAccessDialog
                                  userId={user.id}
                                  userName={user.name || 'Unknown User'}
                                  userEmail={user.contact?.email || 'No email'}
                                  onSupportAccess={handleSupportAccess}
                                >
                                  <DropdownMenuItem 
                                    disabled={user.role === 'admin'}
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Support Access
                                  </DropdownMenuItem>
                                </SupportAccessDialog>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(user)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </ThemeCard>
              </TabsContent>

              <TabsContent value="plans" className="mt-0 space-y-6">
                {/* Plan Configuration Management */}
                <ThemeCard>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Plan Configuration</CardTitle>
                        <CardDescription>Manage plan prices, minutes, and features</CardDescription>
                      </div>
                      <Button onClick={fetchPlanConfigs} variant="outline" size="sm">
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingPlanConfigs ? (
                      <div className="text-center py-8">Loading plan configurations...</div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Object.values(planConfigs).map((plan) => (
                          <Card key={plan.key} className="border-border/40 bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                              <CardTitle className="text-lg">{plan.name}</CardTitle>
                              <CardDescription>Plan Key: {plan.key}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <Label className="text-sm text-muted-foreground">Price</Label>
                                <p className="text-xl font-semibold">${plan.price}/month</p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">Minutes Limit</Label>
                                <p className="text-lg">
                                  {plan.minutesLimit === 0 ? 'Unlimited' : `${plan.minutesLimit.toLocaleString()} min`}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm text-muted-foreground">Features</Label>
                                <p className="text-sm text-muted-foreground">{plan.features.length} features</p>
                              </div>
                              <Button 
                                onClick={() => openEditPlanDialog(plan.key)} 
                                variant="outline" 
                                className="w-full"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Plan
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </ThemeCard>

                {/* User Plans & Minutes */}
                <ThemeCard>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>User Plans & Minutes</CardTitle>
                        <CardDescription>Track user subscriptions and usage</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, or plan..."
                            value={planSearchTerm}
                            onChange={(e) => setPlanSearchTerm(e.target.value)}
                            className="pl-8 w-72"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Minutes Limit</TableHead>
                          <TableHead>Used</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlanUsers.map((user) => {
                          const status = getUsageStatus(user);
                          return (
                            <TableRow key={`plan-${user.id}`}>
                              <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                              <TableCell className="text-muted-foreground">{user.contact?.email || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {formatPlanName(user.plan)}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatMinutes(user.minutes_limit, user.plan)}</TableCell>
                              <TableCell>{user.minutes_used?.toLocaleString() || 0} min</TableCell>
                              <TableCell>{getRemainingMinutes(user)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusBadgeClasses(status)}>
                                  {status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openPlanDialog(user)}>
                                  Change Plan
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </ThemeCard>
              </TabsContent>
            </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={editUserData.name || ''}
                  onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">Role</Label>
                <Select value={editUserData.role || ''} onValueChange={(value) => setEditUserData({...editUserData, role: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-company" className="text-right">Company</Label>
                <Input
                  id="edit-company"
                  value={editUserData.company || ''}
                  onChange={(e) => setEditUserData({...editUserData, company: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-industry" className="text-right">Industry</Label>
                <Input
                  id="edit-industry"
                  value={editUserData.industry || ''}
                  onChange={(e) => setEditUserData({...editUserData, industry: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">Status</Label>
                <Select value={editUserData.is_active ? 'active' : 'inactive'} onValueChange={(value) => setEditUserData({...editUserData, is_active: value === 'active'})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={isViewUserOpen} onOpenChange={(open) => {
          setIsViewUserOpen(open);
          if (open && selectedUser) {
            fetchUserStats(selectedUser.id);
          }
        }}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete information about the selected user.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-6 py-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm text-white">{selectedUser.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-white">{selectedUser.contact?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm text-white">{selectedUser.contact?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Role</Label>
                      <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                        {selectedUser.role || 'user'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Company</Label>
                      <p className="text-sm text-white">{selectedUser.company || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Industry</Label>
                      <p className="text-sm text-white">{selectedUser.industry || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>
                        {selectedUser.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm text-white">
                        {selectedUser.created_on ? new Date(selectedUser.created_on).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm text-white">
                      {selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* User Statistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Usage Statistics</h3>
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-gray-400">Loading statistics...</div>
                    </div>
                  ) : userStats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <Label className="text-sm font-medium text-blue-300">Total Assistants</Label>
                        <p className="text-2xl font-bold text-white">{userStats.totalAssistants}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <Label className="text-sm font-medium text-green-300">Total Calls</Label>
                        <p className="text-2xl font-bold text-white">{userStats.totalCalls}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <Label className="text-sm font-medium text-yellow-300">Total Hours</Label>
                        <p className="text-2xl font-bold text-white">{userStats.totalHours}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <Label className="text-sm font-medium text-purple-300">Total Messages</Label>
                        <p className="text-2xl font-bold text-white">{userStats.totalMessages}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg col-span-2">
                        <Label className="text-sm font-medium text-orange-300">Current Plan</Label>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {userStats.plan || 'Free'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-red-400">Failed to load statistics</div>
                      <div className="text-xs text-gray-500">
                        Debug info: loadingStats={loadingStats.toString()}, userStats={userStats ? 'exists' : 'null'}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => selectedUser && fetchUserStats(selectedUser.id)}
                        className="text-xs"
                      >
                        Retry Loading Stats
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewUserOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4">
                <p className="text-sm text-white">
                  You are about to delete <strong>{selectedUser.name}</strong> ({selectedUser.contact?.email}).
                  This will permanently remove their account and all associated data.
                </p>
                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-200 font-medium">⚠️ Warning:</p>
                  <p className="text-sm text-red-200 mt-1">
                    This action will permanently delete ALL user data including:
                  </p>
                  <ul className="text-sm text-red-200 mt-2 ml-4 list-disc">
                    <li>Assistants and their configurations</li>
                    <li>Campaigns and call history</li>
                    <li>Contacts and contact lists</li>
                    <li>CSV files and uploaded data</li>
                    <li>SMS messages and history</li>
                    <li>Knowledge bases and documents</li>
                    <li>Calendar and WhatsApp integrations</li>
                    <li>Twilio credentials and settings</li>
                    <li>Workspace preferences</li>
                  </ul>
                  <p className="text-sm text-red-200 mt-2 font-medium">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteUserOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Plan & Minutes Dialog */}
        <Dialog
          open={planDialogOpen}
          onOpenChange={(open) => {
            setPlanDialogOpen(open);
            if (!open) {
              setPlanDialogUser(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Assign Plan & Minutes</DialogTitle>
              <DialogDescription>
                Update the subscription plan and minutes allocation for this user.
              </DialogDescription>
            </DialogHeader>
            {planDialogUser && (
              <div className="space-y-4">
                <div className="grid gap-2 rounded-lg border border-border/40 bg-muted/10 p-4">
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="text-lg font-medium text-foreground">{planDialogUser.name || planDialogUser.contact?.email || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{planDialogUser.contact?.email || 'No email on file'}</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plan</Label>
                  <Select
                    value={planDialogPlan}
                    onValueChange={handlePlanDialogPlanChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(planConfigs).length > 0 ? (
                        Object.values(planConfigs).map((plan) => (
                          <SelectItem key={plan.key} value={plan.key}>
                            {plan.name} ({plan.minutesLimit === 0 ? 'Unlimited' : `${plan.minutesLimit.toLocaleString()} min`})
                          </SelectItem>
                        ))
                      ) : (
                        Object.values(PLAN_CONFIGS).map((plan) => (
                          <SelectItem key={plan.key} value={plan.key}>
                            {plan.name} ({plan.minutesLimit === 0 ? 'Unlimited' : `${plan.minutesLimit.toLocaleString()} min`})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Minutes Limit</Label>
                    <Input
                      type="number"
                      min={0}
                      value={planDialogMinutesLimit ?? ''}
                      onChange={(e) => setPlanDialogMinutesLimit(Math.max(0, Number(e.target.value)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to 0 for unlimited minutes.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Minutes Used</Label>
                    <Input
                      type="number"
                      min={0}
                      value={planDialogMinutesUsed ?? 0}
                      onChange={(e) => setPlanDialogMinutesUsed(Math.max(0, Number(e.target.value)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Set starting usage (defaults to 0 when changing plans).
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePlanSave} disabled={planDialogLoading}>
                {planDialogLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Configuration Dialog */}
        <Dialog open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Plan Configuration</DialogTitle>
              <DialogDescription>
                {user?.slug_name 
                  ? `Update plan price, minutes limit, and features for your whitelabel tenant. Changes will apply to all new subscriptions on your tenant.`
                  : `Update plan price, minutes limit, and features. Changes will apply to all new subscriptions.`}
              </DialogDescription>
            </DialogHeader>
            {editingPlanKey && (
              <div className="space-y-4">
                <div className="grid gap-2 rounded-lg border border-border/40 bg-muted/10 p-4">
                  <div className="text-sm text-muted-foreground">Plan Key</div>
                  <div className="text-lg font-medium text-foreground">{editingPlanKey}</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plan-name">Plan Name</Label>
                  <Input
                    id="edit-plan-name"
                    value={editPlanData.name || ''}
                    onChange={(e) => setEditPlanData({...editPlanData, name: e.target.value})}
                    placeholder="e.g., Starter, Professional"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-plan-price">Price (USD/month)</Label>
                    <Input
                      id="edit-plan-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={editPlanData.price ?? ''}
                      onChange={(e) => setEditPlanData({...editPlanData, price: Number(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-plan-minutes">Minutes Limit</Label>
                    <Input
                      id="edit-plan-minutes"
                      type="number"
                      min={adminMinutesLimit !== null && adminMinutesLimit > 0 ? 1 : 0}
                      value={editPlanData.minutesLimit ?? ''}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        // Prevent setting to 0 (unlimited) if admin has limited minutes
                        if (adminMinutesLimit !== null && adminMinutesLimit > 0 && value === 0) {
                          toast.error(`Cannot set to unlimited. You have a limited plan (${adminMinutesLimit} minutes).`);
                          return;
                        }
                        setEditPlanData({...editPlanData, minutesLimit: value});
                      }}
                      placeholder={adminMinutesLimit !== null && adminMinutesLimit > 0 ? "Enter minutes (min: 1)" : "0 for unlimited"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {adminMinutesLimit !== null && adminMinutesLimit > 0 
                        ? `You have ${adminMinutesLimit.toLocaleString()} total minutes. The sum of all plan minutes cannot exceed this.`
                        : "Set to 0 for unlimited minutes"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plan-features">Features</Label>
                  <Textarea
                    id="edit-plan-features"
                    value={(editPlanData.features || []).join('\n')}
                    onChange={(e) => {
                      const features = e.target.value.split('\n').filter(f => f.trim());
                      setEditPlanData({...editPlanData, features});
                    }}
                    placeholder="Enter one feature per line"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one feature per line. Each line will be a separate feature.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditPlanOpen(false);
                setAdminMinutesLimit(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSavePlan} disabled={loadingPlanConfigs}>
                {loadingPlanConfigs ? 'Saving...' : 'Save Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        </div>
      </div>
    </ThemeContainer>
  </DashboardLayout>
);
};

export default AdminPanel;
