import { useState, useEffect } from 'react';
import { MagnifyingGlass, Users, Envelope, DotsThree, Shield, Crown, Trash, Plus, Eye, ArrowsClockwise } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AlertTriangle } from "lucide-react";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full workspace access, can manage members and settings",
  manager: "Can manage content and workflows, limited settings access",
  member: "Can create and edit content within the workspace",
  viewer: "Read-only access to workspace content"
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export function MembersSettings() {
  const { currentWorkspace, canManageMembers } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Confirm remove member
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Change role state
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  // Resend state
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembersAndInvitations();
    }
  }, [currentWorkspace]);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const fetchMembersAndInvitations = async () => {
    if (!currentWorkspace) return;
    try {
      setIsLoading(true);
      const [{ data: membersData, error: membersError }, { data: invitationsData, error: invitationsError }] =
        await Promise.all([
          supabase.from('workspace_members').select('*').eq('workspace_id', currentWorkspace.id),
          supabase.from('workspace_invitations').select('*').eq('workspace_id', currentWorkspace.id).eq('status', 'pending')
        ]);

      if (membersError) throw membersError;
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

    // Validate email format
    if (!EMAIL_REGEX.test(inviteEmail)) {
      setInviteEmailError("Please enter a valid email address");
      return;
    }

    // Check for duplicate in existing members/pending invitations
    const alreadyMember = members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase());
    const alreadyInvited = invitations.some(i => i.email.toLowerCase() === inviteEmail.toLowerCase());
    if (alreadyMember) {
      setInviteEmailError("This person is already a member of this workspace");
      return;
    }
    if (alreadyInvited) {
      setInviteEmailError("This person already has a pending invitation");
      return;
    }

    setInviteEmailError("");
    setIsInviting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/workspaces/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ workspaceId: currentWorkspace.id, email: inviteEmail, role: inviteRole })
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
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentWorkspace) return;
    setIsRemoving(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/workspaces/${currentWorkspace.id}/members/${memberToRemove.id}`, {
        method: 'DELETE',
        headers
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to remove member');
      toast.success('Member removed from workspace');
      setMemberToRemove(null);
      fetchMembersAndInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!currentWorkspace) return;
    setChangingRoleFor(memberId);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/workspaces/${currentWorkspace.id}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ role: newRole })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update role');
      toast.success(`Role updated to ${newRole}`);
      fetchMembersAndInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setChangingRoleFor(null);
    }
  };

  const handleResendInvitation = async (invitationId: string, email: string) => {
    setResendingId(invitationId);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/workspaces/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to resend invitation');
      toast.success(`Invitation resent to ${email}`);
      fetchMembersAndInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE}/workspaces/invitations/${invitationId}`, {
        method: 'DELETE',
        headers
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to cancel invitation');
      toast.success('Invitation cancelled');
      fetchMembersAndInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation');
    } finally {
      setCancellingId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown size={14} weight="duotone" className="text-yellow-500" />;
      case 'admin': return <Shield size={14} weight="duotone" className="text-blue-500" />;
      case 'manager': return <Shield size={14} weight="duotone" className="text-purple-500" />;
      case 'member': return <Users size={14} weight="duotone" className="text-emerald-500" />;
      case 'viewer': return <Eye size={14} weight="duotone" className="text-gray-400" />;
      default: return <Users size={14} weight="duotone" className="text-emerald-500" />;
    }
  };

  const getInitials = (email: string) => email.substring(0, 2).toUpperCase();

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const filteredMembers = members.filter(m =>
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (roleFilter === 'all' || m.role === roleFilter)
  );

  const filteredInvitations = invitations.filter(i =>
    i.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (roleFilter === 'all' || i.role === roleFilter)
  );

  const totalCount = filteredMembers.length + filteredInvitations.length;

  const roleOptions = currentWorkspace?.workspace_type === 'agency'
    ? [
        { value: 'admin', label: 'Admin' },
        { value: 'member', label: 'Member' },
        { value: 'viewer', label: 'Viewer' }
      ]
    : [
        { value: 'manager', label: 'Manager' },
        { value: 'viewer', label: 'Viewer' }
      ];

  if (isLoading || !currentWorkspace) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">Members</h2>
        <p className="text-sm text-muted-foreground mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {members.length} member{members.length !== 1 ? 's' : ''}
            {invitations.length > 0 && ` · ${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManageMembers && (
          <Button
            onClick={() => { setInviteEmail(""); setInviteRole("member"); setInviteEmailError(""); setShowInviteDialog(true); }}
            className="backdrop-blur-sm bg-primary/90 hover:bg-primary transition-all duration-200 border border-primary/20"
          >
            <Plus size={16} weight="bold" className="mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
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
            {roleOptions.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Member list */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-white/[0.1]"
                    disabled={changingRoleFor === member.id}
                  >
                    <DotsThree size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl w-52">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Shield size={14} weight="duotone" className="mr-2" />
                      Change role
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl w-64">
                      {roleOptions.map(r => (
                        <DropdownMenuItem
                          key={r.value}
                          onClick={() => handleChangeRole(member.id, r.value)}
                          disabled={member.role === r.value}
                          className="cursor-pointer flex-col items-start gap-0.5 py-2"
                        >
                          <div className="flex items-center gap-2 font-medium">
                            {getRoleIcon(r.value)}
                            {r.label}
                            {member.role === r.value && (
                              <Badge variant="secondary" className="text-[9px] ml-auto">Current</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground pl-5">
                            {ROLE_DESCRIPTIONS[r.value]}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setMemberToRemove(member)}
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

        {/* Pending invitations */}
        {filteredInvitations.map((invitation) => {
          const expired = isExpired(invitation.expires_at);
          return (
            <div
              key={invitation.id}
              className={`group flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl border border-dashed transition-all duration-300 ${
                expired
                  ? 'border-destructive/30 bg-destructive/5 opacity-60'
                  : 'border-white/[0.12] bg-white/[0.01] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <Avatar className="w-10 h-10 border border-dashed border-white/[0.2]">
                  <AvatarFallback className="bg-muted/10 text-muted-foreground">
                    <Envelope size={18} weight="duotone" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground italic">
                      {expired ? 'Expired Invitation' : 'Pending Invitation'}
                    </p>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5 px-1.5 border-white/[0.1] bg-white/[0.05]">
                      <div className="flex items-center gap-1.5">
                        {getRoleIcon(invitation.role)}
                        {invitation.role}
                      </div>
                    </Badge>
                    {expired && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Expired</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {expired
                      ? `Expired ${new Date(invitation.expires_at).toLocaleDateString()}`
                      : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>

              {canManageMembers && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-white/[0.1]"
                      disabled={resendingId === invitation.id || cancellingId === invitation.id}
                    >
                      <DotsThree size={20} weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl">
                    <DropdownMenuItem
                      onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                      disabled={resendingId === invitation.id}
                      className="cursor-pointer"
                    >
                      <ArrowsClockwise size={14} weight="duotone" className="mr-2" />
                      {resendingId === invitation.id ? 'Resending...' : (expired ? 'Resend (renew)' : 'Resend invitation')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={cancellingId === invitation.id}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    >
                      <Trash size={16} weight="duotone" className="mr-2" />
                      {cancellingId === invitation.id ? 'Cancelling...' : 'Cancel invitation'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}

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

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Invite team member</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              Send an invitation to join your workspace. They'll receive an email with a link to accept.
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
                onChange={(e) => { setInviteEmail(e.target.value); setInviteEmailError(""); }}
                onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
                className={`backdrop-blur-sm ${inviteEmailError ? 'border-destructive' : ''}`}
              />
              {inviteEmailError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {inviteEmailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-sm font-medium">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-xl">
                  {roleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(r.value)}
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inviteRole && ROLE_DESCRIPTIONS[inviteRole] && (
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[inviteRole]}</p>
              )}
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

      {/* Confirm Remove Member Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="backdrop-blur-xl bg-background/95 border-white/[0.08] rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-medium text-foreground">{memberToRemove?.email}</span> from this workspace? They will lose all access immediately.
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-destructive/5 border-destructive/20 my-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm text-destructive/80">
              This action cannot be undone. The member will need a new invitation to rejoin.
            </AlertDescription>
          </Alert>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
