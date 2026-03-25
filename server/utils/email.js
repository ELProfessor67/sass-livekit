import nodemailer from 'nodemailer';

// Email transporter configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Create a transporter dynamically from provided SMTP credentials
 * @param {Object} credentials - SMTP credentials
 * @returns {Object} - Nodemailer transporter
 */
export const createDynamicTransporter = (credentials) => {
    return nodemailer.createTransport({
        host: credentials.smtp_host,
        port: parseInt(credentials.smtp_port),
        secure: credentials.smtp_secure,
        auth: {
            user: credentials.smtp_user,
            pass: credentials.smtp_pass,
        },
    });
};

/**
 * Send an email using specialized HTML templates
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {Object} [options.smtpCredentials] - Optional dynamic SMTP credentials
 * @returns {Promise<Object>} - Promise resolving to the send result
 */
export const sendEmail = async ({ to, subject, html, smtpCredentials }) => {
    const from = smtpCredentials
        ? (smtpCredentials.from_name
            ? `"${smtpCredentials.from_name}" <${smtpCredentials.from_email}>`
            : smtpCredentials.from_email)
        : (process.env.EMAIL_FROM || '"UltraTalk AI" <noreply@ultratalkai.com>');

    try {
        const activeTransporter = smtpCredentials
            ? createDynamicTransporter(smtpCredentials)
            : transporter;

        const info = await activeTransporter.sendMail({
            from,
            to,
            subject,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generate the workspace invitation email template
 * @param {Object} data - Invitation data
 * @param {string} data.workspaceName - Name of the workspace
 * @param {string} data.inviterName - Name of the person who invited
 * @param {string} data.invitationLink - Link to accept the invitation
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
