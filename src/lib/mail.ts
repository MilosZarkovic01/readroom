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

function fromHost() {
  const match = fromAddress().match(/@([^>]+)/);
  return match?.[1] ?? "none";
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const smtpReady = isEmailConfigured();
  // #region agent log
  fetch("http://127.0.0.1:7866/ingest/799abf13-21c8-4bf6-b833-707b1ff5f96f", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "a6ec37",
    },
    body: JSON.stringify({
      sessionId: "a6ec37",
      hypothesisId: "B",
      location: "src/lib/mail.ts:sendEmail",
      message: "sendEmail config",
      data: {
        smtpReady,
        hasHost: Boolean(env("SMTP_HOST")),
        hasUser: Boolean(smtpUser()),
        hasPass: Boolean(env("SMTP_PASS")),
        fromHost: fromHost(),
        hasResendKey: Boolean(env("RESEND_API_KEY")),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  console.info(
    "[readroom-mail]",
    JSON.stringify({
      smtpReady,
      hasHost: Boolean(env("SMTP_HOST")),
      hasUser: Boolean(smtpUser()),
      hasPass: Boolean(env("SMTP_PASS")),
      fromHost: fromHost(),
      hasResendKey: Boolean(env("RESEND_API_KEY")),
    }),
  );

  if (!smtpReady) {
    // #region agent log
    fetch("http://127.0.0.1:7866/ingest/799abf13-21c8-4bf6-b833-707b1ff5f96f", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a6ec37",
      },
      body: JSON.stringify({
        sessionId: "a6ec37",
        hypothesisId: "B",
        location: "src/lib/mail.ts:sendEmail",
        message: "sendEmail blocked: smtp not configured",
        data: { smtpReady: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw new Error("Email is not configured");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port: Number(env("SMTP_PORT") || 587),
      secure: env("SMTP_SECURE") === "true",
      auth: {
        user: smtpUser(),
        pass: env("SMTP_PASS"),
      },
    });

    await transporter.sendMail({
      from: fromAddress(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    // #region agent log
    fetch("http://127.0.0.1:7866/ingest/799abf13-21c8-4bf6-b833-707b1ff5f96f", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a6ec37",
      },
      body: JSON.stringify({
        sessionId: "a6ec37",
        hypothesisId: "C",
        location: "src/lib/mail.ts:sendEmail",
        message: "smtp send ok",
        data: { fromHost: fromHost() },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch (error) {
    const errName = error instanceof Error ? error.name : "unknown";
    const errHint =
      error instanceof Error && /own email address|verify a domain/i.test(error.message)
        ? "resend-owner-only"
        : error instanceof Error && /auth|invalid login|eauth/i.test(error.message)
          ? "smtp-auth"
          : "other";
    // #region agent log
    fetch("http://127.0.0.1:7866/ingest/799abf13-21c8-4bf6-b833-707b1ff5f96f", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a6ec37",
      },
      body: JSON.stringify({
        sessionId: "a6ec37",
        hypothesisId: "A",
        location: "src/lib/mail.ts:sendEmail",
        message: "sendEmail failed",
        data: { errName, errHint },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }
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
