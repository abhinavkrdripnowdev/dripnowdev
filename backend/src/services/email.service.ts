import nodemailer from 'nodemailer';
import { env } from '../config/env';

function createTransporter() {
  const host = env.SMTP_HOST || (env.RESEND_API_KEY ? 'smtp.resend.com' : undefined);
  const user = env.SMTP_USER || (env.RESEND_API_KEY ? 'resend' : undefined);
  const pass = env.SMTP_PASS || env.RESEND_API_KEY;

  if (!host || !pass) {
    // Fallback to Ethereal mock transport in development
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mock@ethereal.email',
        pass: 'mockpassword',
      },
    });
  }

  const port = Number(env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const transporter = createTransporter();

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (env.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`\n📧 [EMAIL MOCK] Preview URL: ${previewUrl}\n`);
    }
  } catch (error) {
    console.warn(`\n📧 [EMAIL SERVICE WARNING] Failed to send email via SMTP (${(error as Error).message}). Falling back to console log:`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    if (env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

export async function sendEmailVerification(
  to: string,
  name: string,
  verificationUrl: string
): Promise<void> {
  await sendMail(
    to,
    'Verify your DripNow email address',
    `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 12px;">
      <h1 style="color: #8b5cf6; font-size: 24px; margin-bottom: 8px;">Welcome to DripNow, ${name}!</h1>
      <p style="color: #8d96a0; margin-bottom: 24px;">Please verify your email address to activate your account.</p>
      <a href="${verificationUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #f97316); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
      <p style="color: #8d96a0; margin-top: 24px; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    </div>
    `
  );
}

export async function sendEmailOtpCode(
  to: string,
  name: string,
  otp: string
): Promise<void> {
  await sendMail(
    to,
    'Your DripNow Verification Code',
    `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 12px; border: 1px solid #30363d;">
      <h1 style="color: #8b5cf6; font-size: 24px; margin-bottom: 8px;">Verify your DripNow Email</h1>
      <p style="color: #8d96a0; margin-bottom: 24px;">Hi ${name}, use the code below to complete your registration:</p>
      <div style="background: rgba(139, 92, 246, 0.15); border: 1px dashed #8b5cf6; padding: 16px 24px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #a78bfa; text-align: center; margin-bottom: 24px;">
        ${otp}
      </div>
      <p style="color: #8d96a0; font-size: 14px;">This OTP will expire in 10 minutes. If you didn't request this code, please ignore this email.</p>
    </div>
    `
  );
}

export async function sendPasswordResetOtpEmail(
  to: string,
  name: string,
  otp: string
): Promise<void> {
  await sendMail(
    to,
    'Reset Your DripNow Password',
    `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 12px; border: 1px solid #30363d;">
      <h1 style="color: #8b5cf6; font-size: 24px; margin-bottom: 8px;">Password Reset Request</h1>
      <p style="color: #8d96a0; margin-bottom: 24px;">Hi ${name}, use the code below to reset your password:</p>
      <div style="background: rgba(139, 92, 246, 0.15); border: 1px dashed #8b5cf6; padding: 16px 24px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #a78bfa; text-align: center; margin-bottom: 24px;">
        ${otp}
      </div>
      <p style="color: #8d96a0; font-size: 14px;">This OTP will expire in 15 minutes. If you didn't request a password reset, please ignore this email.</p>
    </div>
    `
  );
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  await sendMail(
    to,
    'Reset your DripNow password',
    `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 12px;">
      <h1 style="color: #8b5cf6; font-size: 24px; margin-bottom: 8px;">Password Reset</h1>
      <p style="color: #8d96a0; margin-bottom: 8px;">Hi ${name},</p>
      <p style="color: #8d96a0; margin-bottom: 24px;">We received a request to reset your password. Click the button below to proceed. This link expires in <strong style="color: #f97316;">15 minutes</strong>.</p>
      <a href="${resetUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #f97316); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
      <p style="color: #8d96a0; margin-top: 24px; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your account is safe.</p>
    </div>
    `
  );
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendMail(
    to,
    'Welcome to DripNow! 🎉',
    `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; background: #0d1117; color: #e6edf3; padding: 40px; border-radius: 12px;">
      <h1 style="color: #8b5cf6; font-size: 24px; margin-bottom: 8px;">You're all set, ${name}!</h1>
      <p style="color: #8d96a0; margin-bottom: 24px;">Your account has been verified and you can now start shopping on DripNow.</p>
    </div>
    `
  );
}
