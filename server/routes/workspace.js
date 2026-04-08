import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../utils/auth.js';
import { sendEmail, getInvitationEmailTemplate } from '../utils/email.js';
import crypto from 'crypto';

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Invite a member to a workspace
 * POST /api/v1/workspaces/invite
 */
router.post('/invite', authenticateToken, async (req, res) => {
    try {
        const { workspaceId, email, role = 'member' } = req.body;
        const inviterId = req.user.id;

        if (!workspaceId || !email) {
            return res.status(400).json({ success: false, message: 'Workspace ID and email are required' });
        }

        // Block trial users from inviting members
        const { data: inviterData } = await supabaseAdmin
            .from('users')
            .select('trial_ends_at')
            .eq('id', inviterId)
            .single();

        if (inviterData?.trial_ends_at) {
            return res.status(403).json({ success: false, message: 'You must upgrade to a paid plan before inviting members.' });
        }

        // 0. Fetch SMTP credentials for the inviter
        const { data: smtpCredentials, error: smtpError } = await supabaseAdmin
            .from('user_smtp_credentials')
            .select('*')
            .eq('user_id', inviterId)
            .maybeSingle();

        if (!smtpCredentials) {
            return res.status(400).json({
                success: false,
                error_code: 'MISSING_SMTP_CREDENTIALS',
                message: 'Please configure your SMTP settings in Integrations before inviting members.'
            });
        }

        // 1. Verify inviter has permission (is owner or admin of the workspace)
        const { data: inviterMember, error: memberError } = await supabaseAdmin
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', inviterId)
            .single();

        // Also check if they are the workspace owner in workspace_settings
        const { data: workspace, error: wsError } = await supabaseAdmin
            .from('workspace_settings')
            .select('workspace_name, user_id')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        const isOwner = workspace.user_id === inviterId;
        const isAdmin = inviterMember?.role === 'admin' || inviterMember?.role === 'owner';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'You do not have permission to invite members' });
        }

        // 2. Check if user is already a member
        const { data: existingMember, error: checkMemberError } = await supabaseAdmin
            .from('workspace_members')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (existingMember) {
            return res.status(400).json({ success: false, message: 'This user is already a member of this workspace' });
        }

        // 3. Remove any existing invitations for this email in this workspace (cleanup)
        await supabaseAdmin
            .from('workspace_invitations')
            .delete()
            .eq('workspace_id', workspaceId)
            .ilike('email', email);

        // 4. Generate token and create invitation
        const token = crypto.randomBytes(32).toString('hex');
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('workspace_invitations')
            .insert({
                workspace_id: workspaceId,
                email: email.toLowerCase(),
                role,
                invited_by: inviterId,
                token,
                status: 'pending'
            })
            .select()
            .single();

        if (inviteError) {
            throw inviteError;
        }

        // 3. Send invitation email
        const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:8080';
        const invitationLink = `${siteUrl}/accept-invitation?token=${token}`;

        // Get inviter name
        const { data: inviterProfile } = await supabaseAdmin
            .from('users')
            .select('name')
            .eq('id', inviterId)
            .single();

        const inviterName = inviterProfile?.name || 'A team member';

        const emailHtml = getInvitationEmailTemplate({
            workspaceName: workspace.workspace_name,
            inviterName,
            invitationLink
        });

        const emailResult = await sendEmail({
            to: email,
            subject: `Invite to join ${workspace.workspace_name} on UltraTalk AI`,
            html: emailHtml,
            smtpCredentials
        });

        if (!emailResult.success) {
            console.error('Failed to send invitation email but invitation was created in DB');
        }

        return res.json({
            success: true,
            message: 'Invitation sent successfully',
            invitationId: invitation.id
        });

    } catch (error) {
        console.error('Error in workspace invite:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Accept a workspace invitation
 * POST /api/v1/workspaces/accept-invitation
 */
router.post('/accept-invitation', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token is required' });
        }

        // 1. Find and validate invitation
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('workspace_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (inviteError || !invitation) {
            return res.status(404).json({ success: false, message: 'Invalid or expired invitation' });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'This invitation has expired. Please ask the workspace owner to send a new invitation.' });
        }

        // 2a. Validate that the logged-in user's email matches the invitation email
        const normalizedUserEmail = (userEmail || '').toLowerCase().trim();
        const normalizedInviteEmail = (invitation.email || '').toLowerCase().trim();

        if (normalizedInviteEmail && normalizedUserEmail && normalizedUserEmail !== normalizedInviteEmail) {
            return res.status(403).json({
                success: false,
                message: `This invitation was sent to ${invitation.email}. Please sign in with that email address to accept it.`
            });
        }

        // 2b. Add as member
        const { error: memberError } = await supabaseAdmin
            .from('workspace_members')
            .insert({
                workspace_id: invitation.workspace_id,
                user_id: userId,
                email: userEmail || invitation.email,
                role: invitation.role,
                status: 'active',
                joined_at: new Date().toISOString()
            });

        if (memberError) {
            if (memberError.code === '23505') {
                // Already a member, just update invitation
            } else {
                throw memberError;
            }
        }

        // 3. Mark all invitations for this user in this workspace as accepted
        await supabaseAdmin
            .from('workspace_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('workspace_id', invitation.workspace_id)
            .ilike('email', userEmail || invitation.email)
            .eq('status', 'pending');

        return res.json({
            success: true,
            message: 'Invitation accepted successfully',
            workspaceId: invitation.workspace_id
        });

    } catch (error) {
        console.error('Error accepting invitation:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get pending invitation details (public-ish, via token)
 * GET /api/v1/workspaces/invitation-details/:token
 */
router.get('/invitation-details/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const { data: invitation, error } = await supabaseAdmin
            .from('workspace_invitations')
            .select(`
        email,
        role,
        workspace_id,
        expires_at,
        workspace_settings (workspace_name, logo_url)
      `)
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (error || !invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found or already accepted' });
        }

        // Check expiry
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: 'This invitation has expired. Please ask the workspace owner to send a new invitation.' });
        }

        return res.json({ success: true, invitation });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Change a workspace member's role
 * PUT /api/v1/workspaces/:workspaceId/members/:memberId/role
 */
router.put('/:workspaceId/members/:memberId/role', authenticateToken, async (req, res) => {
    try {
        const { workspaceId, memberId } = req.params;
        const { role } = req.body;
        const requesterId = req.user.id;

        const validRoles = ['admin', 'manager', 'member', 'viewer'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }

        // Verify requester is owner or admin of the workspace
        const { data: workspace } = await supabaseAdmin
            .from('workspace_settings')
            .select('user_id')
            .eq('id', workspaceId)
            .single();

        const { data: requesterMember } = await supabaseAdmin
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', requesterId)
            .maybeSingle();

        const isOwner = workspace?.user_id === requesterId;
        const isAdmin = requesterMember?.role === 'admin' || requesterMember?.role === 'owner';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'You do not have permission to change member roles' });
        }

        // Fetch target member
        const { data: targetMember } = await supabaseAdmin
            .from('workspace_members')
            .select('role, user_id')
            .eq('id', memberId)
            .eq('workspace_id', workspaceId)
            .single();

        if (!targetMember) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Cannot change owner role
        if (targetMember.role === 'owner') {
            return res.status(403).json({ success: false, message: 'Cannot change the role of a workspace owner' });
        }

        const { error: updateError } = await supabaseAdmin
            .from('workspace_members')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', memberId)
            .eq('workspace_id', workspaceId);

        if (updateError) throw updateError;

        return res.json({ success: true, message: `Role updated to ${role}` });
    } catch (error) {
        console.error('Error changing member role:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Remove a workspace member
 * DELETE /api/v1/workspaces/:workspaceId/members/:memberId
 */
router.delete('/:workspaceId/members/:memberId', authenticateToken, async (req, res) => {
    try {
        const { workspaceId, memberId } = req.params;
        const requesterId = req.user.id;

        // Verify requester has permission
        const { data: workspace } = await supabaseAdmin
            .from('workspace_settings')
            .select('user_id')
            .eq('id', workspaceId)
            .single();

        const { data: requesterMember } = await supabaseAdmin
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', requesterId)
            .maybeSingle();

        const isOwner = workspace?.user_id === requesterId;
        const isAdmin = requesterMember?.role === 'admin' || requesterMember?.role === 'owner';

        // Users can also remove themselves
        const { data: targetMember } = await supabaseAdmin
            .from('workspace_members')
            .select('role, user_id')
            .eq('id', memberId)
            .eq('workspace_id', workspaceId)
            .single();

        if (!targetMember) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        const isSelf = targetMember.user_id === requesterId;

        if (!isOwner && !isAdmin && !isSelf) {
            return res.status(403).json({ success: false, message: 'You do not have permission to remove this member' });
        }

        if (targetMember.role === 'owner' && !isSelf) {
            return res.status(403).json({ success: false, message: 'Cannot remove the workspace owner' });
        }

        const { error } = await supabaseAdmin
            .from('workspace_members')
            .delete()
            .eq('id', memberId)
            .eq('workspace_id', workspaceId);

        if (error) throw error;

        return res.json({ success: true, message: 'Member removed from workspace' });
    } catch (error) {
        console.error('Error removing member:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Resend a workspace invitation
 * POST /api/v1/workspaces/invitations/:invitationId/resend
 */
router.post('/invitations/:invitationId/resend', authenticateToken, async (req, res) => {
    try {
        const { invitationId } = req.params;
        const requesterId = req.user.id;

        // Fetch the invitation
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('workspace_invitations')
            .select('*, workspace_settings (workspace_name, user_id)')
            .eq('id', invitationId)
            .single();

        if (inviteError || !invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found' });
        }

        // Verify requester is owner or admin
        const { data: workspace } = await supabaseAdmin
            .from('workspace_settings')
            .select('user_id')
            .eq('id', invitation.workspace_id)
            .single();

        const { data: requesterMember } = await supabaseAdmin
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', invitation.workspace_id)
            .eq('user_id', requesterId)
            .maybeSingle();

        const isOwner = workspace?.user_id === requesterId;
        const isAdmin = requesterMember?.role === 'admin' || requesterMember?.role === 'owner';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'You do not have permission to resend invitations' });
        }

        // Regenerate token and extend expiry
        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabaseAdmin
            .from('workspace_invitations')
            .update({ token: newToken, expires_at: newExpiry, status: 'pending' })
            .eq('id', invitationId);

        if (updateError) throw updateError;

        // Fetch SMTP credentials for the requester
        const { data: smtpCredentials } = await supabaseAdmin
            .from('user_smtp_credentials')
            .select('*')
            .eq('user_id', requesterId)
            .maybeSingle();

        if (smtpCredentials) {
            const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:8080';
            const invitationLink = `${siteUrl}/accept-invitation?token=${newToken}`;

            const { data: inviterProfile } = await supabaseAdmin
                .from('users')
                .select('name')
                .eq('id', requesterId)
                .single();

            const emailHtml = getInvitationEmailTemplate({
                workspaceName: invitation.workspace_settings?.workspace_name || 'the workspace',
                inviterName: inviterProfile?.name || 'A team member',
                invitationLink
            });

            await sendEmail({
                to: invitation.email,
                subject: `Reminder: You're invited to join ${invitation.workspace_settings?.workspace_name || 'a workspace'}`,
                html: emailHtml,
                smtpCredentials
            });
        }

        return res.json({ success: true, message: 'Invitation resent successfully' });
    } catch (error) {
        console.error('Error resending invitation:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Cancel a workspace invitation
 * DELETE /api/v1/workspaces/invitations/:invitationId
 */
router.delete('/invitations/:invitationId', authenticateToken, async (req, res) => {
    try {
        const { invitationId } = req.params;
        const requesterId = req.user.id;

        const { data: invitation } = await supabaseAdmin
            .from('workspace_invitations')
            .select('workspace_id')
            .eq('id', invitationId)
            .single();

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found' });
        }

        // Verify permission
        const { data: workspace } = await supabaseAdmin
            .from('workspace_settings')
            .select('user_id')
            .eq('id', invitation.workspace_id)
            .single();

        const { data: requesterMember } = await supabaseAdmin
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', invitation.workspace_id)
            .eq('user_id', requesterId)
            .maybeSingle();

        const isOwner = workspace?.user_id === requesterId;
        const isAdmin = requesterMember?.role === 'admin' || requesterMember?.role === 'owner';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'You do not have permission to cancel this invitation' });
        }

        const { error } = await supabaseAdmin
            .from('workspace_invitations')
            .delete()
            .eq('id', invitationId);

        if (error) throw error;

        return res.json({ success: true, message: 'Invitation cancelled' });
    } catch (error) {
        console.error('Error cancelling invitation:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
