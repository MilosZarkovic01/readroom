import { Resend } from "resend";
import nodemailer from "nodemailer";

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "ReadRoom <onboarding@resend.dev>";
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const from = fromAddress();

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return;
  }

  throw new Error("Email is not configured");
}

export function verificationEmail(code: string) {
  const subject = "Your ReadRoom verification code";
  const text = `Your ReadRoom password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="background:#f7f1e7;padding:32px 16px;font-family:Georgia,serif;color:#2d211b;">
      <div style="max-width:420px;margin:0 auto;background:#fffdf8;border-radius:24px;padding:32px 28px;">
        <p style="margin:0 0 8px;font-size:28px;">ReadRoom</p>
        <p style="margin:0 0 20px;font-family:system-ui,sans-serif;color:#796e66;font-size:14px;">
          Use this verification code to reset your password. It expires in 10 minutes.
        </p>
        <p style="margin:0 0 24px;letter-spacing:0.28em;font-size:32px;font-family:system-ui,sans-serif;font-weight:600;">
          ${code}
        </p>
        <p style="margin:0;font-family:system-ui,sans-serif;color:#796e66;font-size:13px;">
          If you did not request this, you can ignore this email.
        </p>
      </div>
    </div>
  `;
  return { subject, text, html };
}
