import sgMail from '@sendgrid/mail';
import { emailQueue } from '../config/queue.config';
import { User } from '../models/User';
import { EmailTemplates } from '../utils/EmailTemplates';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class EmailService {
  /**
   * Generic email dispatcher
   */
  static async dispatchEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    useQueue = true
  ) {
    const msg = {
      to,
      from: {
        name: process.env.FROM_NAME || 'Finance App Dev',
        email: process.env.FROM_EMAIL || 'tandemodson41@gmail.com',
      },
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''), // fallback to plain text
    };

    if (useQueue) {
      // Only queue the job, do not log excessively here
      return emailQueue.add('send-email', msg);
    }

    try {
      const result = await sgMail.send(msg);
      // Log only relevant info
      console.log(
        `✅ Email sent to ${to} | Subject: ${subject} | Status: ${result[0]?.statusCode}`
      );
      return result;
    } catch (error: any) {
      console.error(
        `❌ SendGrid email failed for ${to}:`,
        error.response?.body || error
      );
      throw new Error('Email sending failed');
    }
  }

  // =====================
  // High-level email functions
  // =====================

  static sendVerificationEmail(
    user: User,
    token: string,
    isInvite = false,
    password?: string,
    inviterName?: string,
    useQueue = true
  ) {
    const { subject, html, text } = EmailTemplates.getVerificationEmail(
      user,
      token,
      isInvite,
      password,
      inviterName
    );
    return this.dispatchEmail(user.email, subject, html, text, useQueue);
  }

  static sendPasswordResetEmail(user: User, token: string, useQueue = true) {
    const { subject, html, text } = EmailTemplates.getPasswordResetEmail(
      user,
      token
    );
    return this.dispatchEmail(user.email, subject, html, text, useQueue);
  }

  static sendInvitationEmail(
    email: string,
    companyName: string,
    token: string,
    useQueue = true
  ) {
    const { subject, html, text } = EmailTemplates.getInvitationEmail(
      email,
      companyName,
      token
    );
    return this.dispatchEmail(email, subject, html, text, useQueue);
  }

  static sendAccountSuspensionEmail(user: User, useQueue = true) {
    const { subject, html, text } = EmailTemplates.getAccountSuspendedEmail(
      user,
      user.company?.name
    );
    return this.dispatchEmail(user.email, subject, html, text, useQueue);
  }

  static sendAccountActivationEmail(user: User, useQueue = true) {
    const { subject, html, text } = EmailTemplates.getAccountActivatedEmail(
      user,
      user.company?.name
    );
    return this.dispatchEmail(user.email, subject, html, text, useQueue);
  }

  static sendRoleUpdateEmail(
    user: User,
    previousRoles: string[],
    newRoles: string[],
    useQueue = true
  ) {
    const { subject, html, text } = EmailTemplates.getRoleChangeEmail(
      user,
      user.company?.name,
      newRoles,
      previousRoles
    );
    return this.dispatchEmail(user.email, subject, html, text, useQueue);
  }

  static sendWelcomeEmail(user: User, useQueue = true) {
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <h2 style="color:#333;">Welcome to Our Platform!</h2>
        <p>Hi ${user.firstName || 'User'},</p>
        <p>Your email has been verified successfully! You can now access all features of your account.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#28a745;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">Go to Dashboard</a>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
      </div>
    `;
    return this.dispatchEmail(
      user.email,
      'Welcome! Your Account is Ready',
      html,
      undefined,
      useQueue
    );
  }

  static sendMemberRemovalEmail(
    user: User,
    companyName: string,
    useQueue = true
  ) {
    const subject = `Removed from ${companyName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>Account Removal Notification</h2>
        <p>Hello ${user.firstName || 'User'},</p>
        <p>Your access to <strong>${companyName}</strong> has been removed by an administrator.</p>
        <p>If you believe this was done in error, please contact your company administrator.</p>
        <hr>
        <p style="color:#666;font-size:12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
    return this.dispatchEmail(user.email, subject, html, undefined, useQueue);
  }

  static sendOwnershipTransferEmail(
    user: User,
    companyName: string,
    type: 'new' | 'previous',
    useQueue = true
  ) {
    const isNewOwner = type === 'new';
    const subject = isNewOwner
      ? `You are now the owner of ${companyName}`
      : `Ownership of ${companyName} has been transferred`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>Company Ownership ${isNewOwner ? 'Transfer' : 'Change'}</h2>
        <p>Hello ${user.firstName || 'User'},</p>
        ${isNewOwner ? `<p>Congratulations! You are now the owner of <strong>${companyName}</strong>.</p>` : `<p>The ownership of <strong>${companyName}</strong> has been transferred to another member.</p>`}
        <p>If you have any questions about this change, please contact support.</p>
        <hr>
        <p style="color:#666;font-size:12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
    return this.dispatchEmail(user.email, subject, html, undefined, useQueue);
  }

  static sendCompanyWelcomeEmail(
    user: User,
    companyName: string,
    addedBy?: string,
    useQueue = true
  ) {
    const subject = `Welcome to ${companyName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>Welcome to ${companyName}!</h2>
        <p>Hello ${user.firstName || 'User'},</p>
        <p>You have been added as a member of <strong>${companyName}</strong>${addedBy ? ` by ${addedBy}` : ''}.</p>
        <p>You can now access your company dashboard and collaborate with your team members.</p>
        <div style="margin:20px 0;padding:15px;background-color:#f8f9fa;border-radius:5px;">
          <p><strong>Your Role:</strong> ${user.roles?.join(', ') || 'Member'}</p>
          <p><strong>Company:</strong> ${companyName}</p>
        </div>
        <p>If you have any questions, please reach out to your company administrator.</p>
        <hr>
        <p style="color:#666;font-size:12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
    return this.dispatchEmail(user.email, subject, html, undefined, useQueue);
  }
}

// Helper for simpler imports
export const sendEmail = EmailService.dispatchEmail.bind(EmailService);
