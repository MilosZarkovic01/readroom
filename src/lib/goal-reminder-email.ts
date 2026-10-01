import { reminderSubject, type PlannedReminder } from "./goal-reminders";

export function appOrigin(env: Record<string, string | undefined> = process.env) {
  const raw = env.READROOM_URL || env.AUTH_URL || "https://readroom-gamma.vercel.app";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "https://readroom-gamma.vercel.app";
    return url.origin;
  } catch {
    return "https://readroom-gamma.vercel.app";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function oneLine(value: string | null | undefined) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function button(href: string, label: string) {
  return `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td align="center" bgcolor="#4a3428" style="border-radius:999px;">
                      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:20px;color:#fffdf8;text-decoration:none;border-radius:999px;">
                        ${escapeHtml(label)}
                      </a>
                    </td>
                  </tr>
                </table>`;
}

function goalBlock(goal: PlannedReminder) {
  const width = Math.max(0, Math.min(100, goal.percent));
  return `
                <h1 style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:600;color:#2d211b;">
                  ${escapeHtml(goal.title)}
                </h1>
                <p style="margin:12px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2d211b;">
                  ${escapeHtml(goal.line)}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td bgcolor="#e4dbc9" style="border-radius:999px;font-size:0;line-height:0;">
                      <div style="width:${width}%;max-width:100%;height:8px;background:#4a3428;border-radius:999px;font-size:0;line-height:0;">&nbsp;</div>
                    </td>
                  </tr>
                </table>`;
}

export function buildGoalReminderEmail(input: {
  name?: string | null;
  goals: PlannedReminder[];
  profileUrl: string;
}) {
  const goals = input.goals;
  const subject = reminderSubject(goals);
  const name = oneLine(input.name);
  const greeting = name ? `${name}, there's still time.` : "There's still time.";
  const repeats = goals.some((goal) => goal.periodKey.startsWith("DAILY:") || goal.periodKey.startsWith("WEEKLY:"));
  const footnote = repeats
    ? "This is the only note for this stretch of the goal. Open ReadRoom when you want to log a few more pages."
    : "This is the only note for this goal. Open ReadRoom when you want to log a few more pages.";

  const text = [
    greeting,
    "",
    ...goals.flatMap((goal) => [goal.title, goal.line, ""]),
    `Open your goals: ${input.profileUrl}`,
    "",
    footnote,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f7f1e7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(subject)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1e7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border-radius:28px;">
            <tr>
              <td style="padding:36px 32px 32px;">
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1;color:#2d211b;">ReadRoom</p>
                <p style="margin:28px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#b86f52;">
                  Reading goal
                </p>
                <p style="margin:12px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2d211b;">
                  ${escapeHtml(greeting)}
                </p>
                ${goals.map((goal) => goalBlock(goal)).join("")}
                ${button(input.profileUrl, "Open your goals")}
                <p style="margin:28px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:#796e66;">
                  ${escapeHtml(footnote)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
