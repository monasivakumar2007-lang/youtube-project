// ============================================================
// src/services/email.service.ts
// Email dispatch service for OTP and Notifications
// ============================================================

import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

if (env.smtp.host && env.smtp.user) {
  try {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.password,
      },
    });
  } catch (err) {
    console.warn('[EMAIL] Failed to initialize SMTP transporter:', err);
  }
}

/**
 * Send an OTP code to a user via email.
 * If SMTP credentials are configured, sends real email.
 * Always prints to dev console when in dev mode.
 */
export async function sendOtpEmail(email: string, otp: string, purpose: string = 'REGISTRATION'): Promise<boolean> {
  // Always log to console in development
  console.log('==================================================');
  console.log('[OTP NOTIFICATION]');
  console.log(`To:      ${email}`);
  console.log(`Code:    ${otp}`);
  console.log(`Purpose: ${purpose}`);
  console.log(`Expires: ${env.otpExpiryMinutes} minutes`);
  console.log('==================================================');

  if (!transporter) {
    return false;
  }

  try {
    const subject = purpose === 'REGISTRATION'
      ? 'StreamVault — Verify Your Email'
      : purpose === 'NEW_DEVICE'
      ? 'StreamVault Security Alert — New Device Sign-in'
      : 'StreamVault — Your 6-Digit Verification Code';

    await transporter.sendMail({
      from: env.smtp.from || `"StreamVault" <${env.smtp.user}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6366f1; margin: 0;">StreamVault</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Security Verification</p>
          </div>
          <p style="color: #334155; font-size: 15px;">Hello,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            Use the following 6-digit verification code to complete your ${purpose.toLowerCase().replace('_', ' ')} request:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e1b4b; background: #e0e7ff; padding: 12px 28px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
            This code will expire in <strong>${env.otpExpiryMinutes} minutes</strong>. If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', error);
    return false;
  }
}
