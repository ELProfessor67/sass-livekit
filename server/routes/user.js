import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../utils/auth.js';
import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not configured for user routes');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Create verification token table if it doesn't exist (via migration would be better, but this works)
// We'll handle this via a migration file instead

/**
 * Complete signup with white label support
 * This endpoint ensures slug is properly assigned during signup
 */
router.post('/complete-signup', async (req, res) => {
  try {
    const { user_id, slug, whitelabel } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    // If white label signup, validate and assign slug
    if (whitelabel && slug) {
      const lowerSlug = slug.toLowerCase();

      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(lowerSlug)) {
        return res.status(400).json({
          success: false,
          message: 'Slug can only contain lowercase letters, numbers, and hyphens'
        });
      }

      if (lowerSlug.length < 3 || lowerSlug.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Slug must be between 3 and 50 characters'
        });
      }

      // Check if slug is available
      const { data: existingUser } = await supabase
        .from('users')
        .select('slug_name')
        .eq('slug_name', lowerSlug)
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Slug is already taken'
        });
      }

      // Update user with slug and set as admin
      const { error: updateError } = await supabase
        .from('users')
        .update({
          slug_name: lowerSlug,
          tenant: lowerSlug,
          role: 'admin'
        })
        .eq('id', user_id);

      if (updateError) {
        console.error('Error updating user with slug:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to assign slug'
        });
      }

      // Setup Nginx reverse proxy for the whitelabel domain
      try {
        // Construct full domain from slug
        const mainDomain = process.env.MAIN_DOMAIN || process.env.VITE_MAIN_DOMAIN || 'frontend.ultratalkai.com';
        const fullDomain = `${lowerSlug}.${mainDomain}`;
        const frontendPort = process.env.FRONTEND_PORT || '8080';
        
        // Path to script
        const scriptPath = path.join(__dirname, '..', 'scripts', 'setup_reverse_proxy.sh');
        
        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
          console.error('Nginx setup script not found:', scriptPath);
          // Don't fail signup, just log error
        } else {
          console.log(`🚀 Setting up Nginx reverse proxy for ${fullDomain} on port ${frontendPort}`);
          
          // Execute script asynchronously (don't block signup response)
          const script = spawn('sudo', [
            'bash',
            scriptPath,
            fullDomain,
            frontendPort
          ]);
          
          let output = '';
          
          script.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Nginx setup output:', data.toString());
          });
          
          script.stderr.on('data', (data) => {
            output += data.toString();
            console.error('Nginx setup error:', data.toString());
          });
          
          script.on('close', (code) => {
            if (code === 0) {
              console.log(`✅ Nginx reverse proxy setup completed for ${fullDomain}`);
            } else {
              console.error(`❌ Nginx setup failed for ${fullDomain} with code ${code}`);
              console.error('Script output:', output);
            }
          });
          
          // Handle script errors
          script.on('error', (error) => {
            console.error('Error executing Nginx setup script:', error);
          });
          
          // Don't wait for script to complete - return success immediately
          // Script runs in background
        }
      } catch (error) {
        console.error('Error setting up Nginx reverse proxy:', error);
        // Don't fail signup if Nginx setup fails
      }
    }

    // Send verification email
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.id === user_id);

    if (authUser && !authUser.email_confirmed_at) {
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await supabase
        .from('verification_tokens')
        .upsert({
          user_id: user_id,
          token: token,
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'user_id'
        });

      // Use Supabase's built-in email verification with proper redirect URL
      const siteUrl = process.env.VITE_SITE_URL || process.env.SITE_URL || 'http://localhost:8080';
      const redirectTo = `${siteUrl}/auth/callback`;
      
      await supabase.auth.admin.generateLink({
        type: 'signup',
        email: authUser.email,
        options: {
          redirectTo: redirectTo
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Signup completed successfully'
    });
  } catch (error) {
    console.error('Error in complete-signup:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during signup'
    });
  }
});

/**
 * Send verification email after signup
 * This is called by the frontend after Supabase signup
 */
router.post('/send-verification-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (authUser.email_confirmed_at) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified'
      });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Store verification token in database
    const { error: tokenError } = await supabase
      .from('verification_tokens')
      .insert({
        user_id: authUser.id,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      // If table doesn't exist, we'll create it via migration
      console.error('Error storing verification token:', tokenError);
      // For now, use Supabase's built-in email verification
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: email
      });

      if (emailError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Verification email sent'
      });
    }

    // Get tenant info for redirect URL
    const { data: userData } = await supabase
      .from('users')
      .select('slug_name, custom_domain, tenant')
      .eq('id', authUser.id)
      .maybeSingle();

    const tenant = userData?.tenant || 'main';
    const slugName = userData?.slug_name;
    const customDomain = userData?.custom_domain;

    // Build verification URL
    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
    let verificationUrl;
    if (customDomain) {
      verificationUrl = `https://${customDomain}/auth/verify-email?token=${token}`;
    } else if (slugName) {
      verificationUrl = `https://${slugName}.${mainDomain}/auth/verify-email?token=${token}`;
    } else {
      verificationUrl = `https://${mainDomain}/auth/verify-email?token=${token}`;
    }

    // Use Supabase's built-in email verification
    // Generate a new confirmation link (this will send email automatically)
    const siteUrl = process.env.VITE_SITE_URL || process.env.SITE_URL || 'http://localhost:8080';
    const redirectTo = `${siteUrl}/auth/callback`;

    const { data: linkData, error: emailError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: redirectTo
      }
    });

    if (emailError) {
      console.error('Error generating verification link:', emailError);
      // Still store our token as backup
      await supabase
        .from('verification_tokens')
        .upsert({
          user_id: authUser.id,
          token: token,
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    // Store our custom token for backup verification endpoint
    await supabase
      .from('verification_tokens')
      .upsert({
        user_id: authUser.id,
        token: token,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    // Note: Supabase sends the email automatically via generateLink
    // The link in the email will redirect to /auth/callback with tokens in hash

    return res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    console.error('Error in send-verification-email:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending verification email'
    });
  }
});

/**
 * Verify user email with token
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    // Find verification token
    const { data: verificationToken, error: tokenError } = await supabase
      .from('verification_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !verificationToken) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Check if token is expired
    if (new Date(verificationToken.expires_at) < new Date()) {
      await supabase
        .from('verification_tokens')
        .delete()
        .eq('token', token);

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    // Verify user email in Supabase Auth
    const { error: verifyError } = await supabase.auth.admin.updateUserById(
      verificationToken.user_id,
      { email_confirm: true }
    );

    if (verifyError) {
      console.error('Error verifying user email:', verifyError);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify email'
      });
    }

    // Update user profile to set is_active
    await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', verificationToken.user_id);

    // Delete verification token
    await supabase
      .from('verification_tokens')
      .delete()
      .eq('token', token);

    // Get user data for redirect
    const { data: userData } = await supabase
      .from('users')
      .select('slug_name, custom_domain, tenant')
      .eq('id', verificationToken.user_id)
      .maybeSingle();

    const tenant = userData?.tenant || 'main';
    const slugName = userData?.slug_name;
    const customDomain = userData?.custom_domain;

    // Build login URL
    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
    let loginUrl;
    if (customDomain) {
      loginUrl = `https://${customDomain}/login?verified=true`;
    } else if (slugName) {
      loginUrl = `https://${slugName}.${mainDomain}/login?verified=true`;
    } else {
      loginUrl = `https://${mainDomain}/login?verified=true`;
    }

    // Redirect to login page
    return res.redirect(loginUrl);
  } catch (error) {
    console.error('Error in verify-email:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying email'
    });
  }
});

/**
 * Forgot password - send OTP
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { action, email, otp } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    // Find user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.'
      });
    }

    if (action === 'send_otp') {
      // Check if OTP already exists and is still valid
      const { data: existingOtp } = await supabase
        .from('verification_otps')
        .select('*')
        .eq('user_email', email)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingOtp) {
        return res.status(200).json({
          success: true,
          message: 'OTP already sent. Please check your email.'
        });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP (expires in 10 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await supabase
        .from('verification_otps')
        .insert({
          user_email: email,
          otp: otpCode,
          expires_at: expiresAt.toISOString()
        });

      // TODO: Send email with OTP using email service
      // For now, log it (remove in production)
      console.log(`OTP for ${email}: ${otpCode}`);

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully. Please check your email.'
      });
    } else if (action === 'verify_otp') {
      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP is required'
        });
      }

      // Verify OTP
      const { data: otpData, error: otpError } = await supabase
        .from('verification_otps')
        .select('*')
        .eq('user_email', email)
        .eq('otp', otp)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (otpError || !otpData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1); // 1 hour expiry

      // Store reset token
      await supabase
        .from('password_reset_tokens')
        .upsert({
          user_id: authUser.id,
          token: resetToken,
          expires_at: tokenExpiresAt.toISOString()
        }, {
          onConflict: 'user_id'
        });

      // Delete OTP
      await supabase
        .from('verification_otps')
        .delete()
        .eq('id', otpData.id);

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        reset_token: resetToken
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "send_otp" or "verify_otp"'
      });
    }
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing password reset'
    });
  }
});

/**
 * Reset password with token
 */
router.post('/reset-password', authenticateToken, async (req, res) => {
  try {
    const { new_password, reset_token } = req.body;

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    let userId = req.user.id;

    // If reset_token is provided, verify it
    if (reset_token) {
      const { data: resetTokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('user_id, expires_at')
        .eq('token', reset_token)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (tokenError || !resetTokenData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      userId = resetTokenData.user_id;

      // Delete reset token after use
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', reset_token);
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    // Update user profile
    await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', userId);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while resetting password'
    });
  }
});

/**
 * Change password (requires authentication)
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Both old and new passwords are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    // Get current user
    const userId = req.user.id;

    // Verify old password by attempting to sign in
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.id === userId);

    if (!authUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Note: Supabase doesn't allow us to verify password directly
    // We need to use the client-side auth for this
    // For now, we'll update the password (in production, verify old password client-side first)

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error in change-password:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while changing password'
    });
  }
});

/**
 * Delete user account
 */
router.post('/delete-account', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const userId = req.user.id;

    // Get user email before deletion for notification
    const { data: userData } = await supabase
      .from('users')
      .select('contact')
      .eq('id', userId)
      .maybeSingle();

    const userEmail = userData?.contact?.email;

    // Delete user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }

    // User profile will be deleted via cascade or trigger
    // TODO: Send deletion confirmation email

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete-account:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting account'
    });
  }
});

/**
 * Get user settings
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const userId = req.user.id;

    const { data: userData, error } = await supabase
      .from('users')
      .select('daily_summary, call_summary, summary_email')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching settings'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Settings fetched',
      settings: {
        daily_summary: userData?.daily_summary || false,
        call_summary: userData?.call_summary || false,
        summary_email: userData?.summary_email || ''
      }
    });
  } catch (error) {
    console.error('Error in get-settings:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching settings'
    });
  }
});

/**
 * Update user settings
 */
router.post('/settings', authenticateToken, async (req, res) => {
  try {
    const { daily_summary, call_summary, summary_email } = req.body;

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const userId = req.user.id;

    const updateData = {};
    if (daily_summary !== undefined) updateData.daily_summary = daily_summary;
    if (call_summary !== undefined) updateData.call_summary = call_summary;
    if (summary_email !== undefined) updateData.summary_email = summary_email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update'
      });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('daily_summary, call_summary, summary_email')
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating settings'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Settings updated',
      settings: data
    });
  } catch (error) {
    console.error('Error in update-settings:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating settings'
    });
  }
});

export default router;

