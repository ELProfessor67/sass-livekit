import { useState, useEffect } from 'react';
import { MagnifyingGlass, Users, Envelope, DotsThree, Shield, Crown, Trash, Plus, Eye } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface WorkspaceMember {
  id: string;
  email: string;
  role: string;
  status: string;
  joined_at?: string;
  invited_at?: string;
  user_name?: string;
}

interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function MembersSettings() {
  const { currentWorkspace, canManageMembers } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembersAndInvitations();
    }
  }, [currentWorkspace]);

  const fetchMembersAndInvitations = async () => {
    if (!currentWorkspace) return;
    try {
      setIsLoading(true);
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (membersError) throw membersError;

      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'pending');

      if (invitationsError) throw invitationsError;

      setMembers(membersData || []);
      setInvitations(invitationsData || []);
    } catch (error) {
      console.error('Error fetching members and invitations:', error);
      toast.error('Failed to load workspace members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteRole || !currentWorkspace) return;

    setIsInviting(true);
    try {
      // Call backend API to handle invitation and email sending
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/workspaces/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          email: inviteEmail,
          role: inviteRole
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error_code === 'MISSING_SMTP_CREDENTIALS') {
          toast.error(result.message, {
            description: "Go to Settings > Integrations to configure your SMTP server.",
            duration: 6000,
          });
          return;
        }
        throw new Error(result.message || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("member");
      fetchMembersAndInvitations();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('This user has already been invited to the workspace');
      } else {
        toast.error('Failed to send invitation');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed from workspace');
      fetchMembersAndInvitations();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      fetchMembersAndInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={14} weight="duotone" className="text-yellow-500" />;
      case 'admin':
        return <Shield size={14} weight="duotone" className="text-blue-500" />;
      case 'manager':
        return <Shield size={14} weight="duotone" className="text-purple-500" />;
      case 'member':
        return <Users size={14} weight="duotone" className="text-emerald-500" />;
      case 'viewer':
        return <Eye size={14} weight="duotone" className="text-gray-400" />;
      default:
        return <Users size={14} weight="duotone" className="text-emerald-500" />;
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Filter members and invitations based on search and role
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredInvitations = invitations.filter(invitation => {
    const matchesSearch = invitation.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || invitation.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalCount = filteredMembers.length + filteredInvitations.length;

  if (isLoading || !currentWorkspace) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your team members and their access levels
          </p>
        </div>
        {canManageMembers && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="backdrop-blur-sm bg-primary/90 hover:bg-primary transition-all duration-200 border border-primary/20"
          >
            <Plus size={16} weight="bold" className="mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 backdrop-blur-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[160px] backdrop-blur-sm">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-xl bg-background/95">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            {currentWorkspace.workspace_type === 'agency' ? (
              <>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </>
            ) : (
              <SelectItem value="manager">Manager</SelectItem>
            )}
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="group flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10 border border-white/[0.12] shadow-sm transition-transform group-hover:scale-105">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {getInitials(member.email)}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {member.user_name || member.email.split('@')[0]}
                  </p>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5 px-1.5 border-white/[0.1] bg-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      {getRoleIcon(member.role)}
                      {member.role}
                    </div>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
            </div>

            {member.role !== 'owner' && canManageMembers && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/[0.1]">
                    <DotsThree size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <Trash size={16} weight="duotone" className="mr-2" />
                    Remove from workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {filteredInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="group flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.01] border border-dashed border-white/[0.12] opacity-70 hover:opacity-100 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10 border border-dashed border-white/[0.2]">
                <AvatarFallback className="bg-muted/10 text-muted-foreground">
                  <Envelope size={18} weight="duotone" />
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground italic">Pending Invitation</p>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5 px-1.5 border-white/[0.1] bg-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      {getRoleIcon(invitation.role)}
                      {invitation.role}
                    </div>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{invitation.email}</p>
              </div>
            </div>

            {canManageMembers && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/[0.1]">
                    <DotsThree size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <Trash size={16} weight="duotone" className="mr-2" />
                    Cancel invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {totalCount === 0 && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.01]">
            <Users size={48} weight="duotone" className="text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-base font-medium text-foreground mb-1">No members found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || roleFilter !== 'all'
                ? "Try adjusting your search or filter criteria."
                : "Invite team members to collaborate in this workspace."
              }
            </p>
          </div>
        )}
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Invite team member</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              Send an invitation to join your workspace. They'll receive an email with instructions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-medium">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-sm font-medium">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl">
                  {currentWorkspace.workspace_type === 'agency' ? (
                    <>
                      <SelectItem value="admin" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield size={16} weight="duotone" className="text-blue-500" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="member" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users size={16} weight="duotone" className="text-emerald-500" />
                          Member
                        </div>
                      </SelectItem>
                    </>
                  ) : (
                    <SelectItem value="manager" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield size={16} weight="duotone" className="text-purple-500" />
                        Manager
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="viewer" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <Eye size={16} weight="duotone" className="text-gray-400" />
                      Viewer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={isInviting}
              className="backdrop-blur-sm border-white/[0.1] hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteMember}
              disabled={!inviteEmail || isInviting}
              className="px-6"
            >
              {isInviting ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}