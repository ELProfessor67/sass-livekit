import sgMail from '@sendgrid/mail';

/**
 * Send an email via SendGrid HTTP API.
 * When smtpCredentials is provided (user's own SendGrid key), it uses that key.
 * Otherwise falls back to the system SENDGRID_API_KEY env var.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {Object} [options.smtpCredentials] - Optional user credentials (smtp_pass = API key)
 */
export const sendEmail = async ({ to, subject, html, smtpCredentials }) => {
    // smtp_pass stores the SendGrid API key for user-configured integrations
    const apiKey = smtpCredentials?.smtp_pass || process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        console.error('No SendGrid API key available');
        return { success: false, error: 'No SendGrid API key configured' };
    }

    const fromEmail = smtpCredentials
        ? smtpCredentials.from_email
        : (process.env.EMAIL_FROM_ADDRESS || 'noreply@ultratalkai.com');

    const fromName = smtpCredentials?.from_name || process.env.EMAIL_FROM_NAME || 'UltraTalk AI';

    console.log('[SendGrid Debug] API key prefix:', apiKey?.substring(0, 10));
    console.log('[SendGrid Debug] From email:', fromEmail);

    sgMail.setApiKey(apiKey);

    try {
        await sgMail.send({
            to,
            from: { email: fromEmail, name: fromName },
            subject,
            html,
        });

        console.log('Email sent via SendGrid to:', to);
        return { success: true };
    } catch (error) {
        console.error('Error sending email via SendGrid:', error?.response?.body || error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Generate the workspace invitation email template
 */
export const getInvitationEmailTemplate = ({ workspaceName, inviterName, invitationLink }) => {
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #000;">You've been invited to join ${workspaceName}</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join their workspace <strong>${workspaceName}</strong> on UltraTalk AI.</p>
      <div style="margin: 30px 0;">
        <a href="${invitationLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
      </div>
      <p style="font-size: 0.9em; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 0.9em; color: #666; word-break: break-all;">${invitationLink}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 0.8em; color: #999;">This email was sent by UltraTalk AI. If you weren't expecting this invitation, you can safely ignore this email.</p>
    </div>
  `;
};
