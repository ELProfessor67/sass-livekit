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
            return res.status(400).json({ success: false, message: 'Invitation has expired' });
        }

        // 2. Add as member
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
        workspace_settings (workspace_name, logo_url)
      `)
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (error || !invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found' });
        }

        return res.json({ success: true, invitation });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
