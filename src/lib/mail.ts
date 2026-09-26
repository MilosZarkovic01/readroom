import nodemailer from "nodemailer";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function smtpUser() {
  return env("SMTP_USER");
}

function fromAddress() {
  const from = env("EMAIL_FROM");
  if (from) return from;
  const user = smtpUser();
  return user ? `ReadRoom <${user}>` : "ReadRoom";
}

export function isEmailConfigured() {
  return Boolean(env("SMTP_HOST") && smtpUser() && env("SMTP_PASS"));
}

function isStgMail() {
  return env("READROOM_ENV") === "stg" || process.env.VERCEL_ENV === "preview";
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ inboxUrl?: string }> {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT") || 587),
    secure: env("SMTP_SECURE") === "true",
    auth: {
      user: smtpUser(),
      pass: env("SMTP_PASS"),
    },
  });

  const info = await transporter.sendMail({
    from: fromAddress(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return {
    inboxUrl: isStgMail() && previewUrl ? previewUrl : undefined,
  };
}

function codeEmail(code: string, purpose: "reset" | "signup") {
  const action =
    purpose === "reset" ? "reset your password" : "verify your email";
  const subject = "Your ReadRoom verification code";
  const text = `Your ReadRoom verification code is ${code}. Use it to ${action}. It expires in 10 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="background:#f7f1e7;padding:32px 16px;font-family:Georgia,serif;color:#2d211b;">
      <div style="max-width:420px;margin:0 auto;background:#fffdf8;border-radius:24px;padding:32px 28px;">
        <p style="margin:0 0 8px;font-size:28px;">ReadRoom</p>
        <p style="margin:0 0 20px;font-family:system-ui,sans-serif;color:#796e66;font-size:14px;">
          Use this verification code to ${action}. It expires in 10 minutes.
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

export function verificationEmail(code: string) {
  return codeEmail(code, "reset");
}

export function signupVerificationEmail(code: string) {
  return codeEmail(code, "signup");
}
