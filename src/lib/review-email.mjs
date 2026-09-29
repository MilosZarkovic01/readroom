import { safeHttpsUrl } from "./safe-url.mjs";

/**
 * @param {{
 *   title: string;
 *   url: string;
 *   number: string;
 *   author: string;
 *   previewUrl?: string;
 *   mergeUrl?: string;
 * }} input
 */
export function buildReviewEmail({ title, url, number, author, previewUrl = "", mergeUrl = "" }) {
  const cleanTitle = oneLine(title) || "ReadRoom pull request";
  const cleanAuthor = oneLine(author) || "unknown";
  const cleanNumber = oneLine(number);
  const prUrl = safeHttpsUrl(url, ["github.com"]);
  const preview = safeHttpsUrl(previewUrl, ["*.vercel.app"]);
  const merge = safeHttpsUrl(mergeUrl, ["readroom-gamma.vercel.app"]);
  const actionUrl = merge || prUrl;
  const actionLabel = merge ? "Merge pull request" : "Open pull request";
  const subject = preview
    ? `ReadRoom preview is ready: ${cleanTitle}`
    : `ReadRoom MR ready for review: ${cleanTitle}`;
  const numberLabel = cleanNumber ? `#${cleanNumber}` : "Pull request";
  const intro = preview
    ? "The Vercel preview for this pull request is live. Open it, or merge into master after CI has passed."
    : "A pull request is ready for review. The merge page shows the Vercel preview once that deployment is live, and it merges only after CI has passed.";
  const footnote = merge
    ? "The merge button opens a confirmation page. Opening or previewing this email does not merge anything. The link expires in 7 days, and the pull request merges only when CI has passed."
    : "Merge this on GitHub after CI has passed.";

  const text = [
    intro,
    "",
    `Title: ${cleanTitle}`,
    `Author: ${cleanAuthor}`,
    `Number: ${numberLabel}`,
    prUrl ? `Pull request: ${prUrl}` : "",
    preview ? `Preview: ${preview}` : "",
    merge ? `Merge: ${merge}` : "",
    "",
    footnote,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f7f1e7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(numberLabel)} by ${escapeHtml(cleanAuthor)} is ready for review.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1e7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border-radius:28px;">
            <tr>
              <td style="padding:36px 32px 32px;">
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1;color:#2d211b;">ReadRoom</p>
                <p style="margin:28px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#b86f52;">
                  ${preview ? "Preview deployment" : "Ready for review"}
                </p>
                <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:600;color:#2d211b;">
                  ${escapeHtml(cleanTitle)}
                </h1>
                <p style="margin:12px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#796e66;">
                  ${escapeHtml(numberLabel)} · ${escapeHtml(cleanAuthor)}
                </p>
                <p style="margin:20px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2d211b;">
                  ${escapeHtml(intro)}
                </p>
                ${actionUrl ? button(actionUrl, actionLabel, true) : ""}
                ${preview ? button(preview, "Open Vercel preview", false) : ""}
                ${prUrl && actionUrl !== prUrl ? textLink(prUrl, "View on GitHub") : ""}
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

/**
 * @param {string} href
 * @param {string} label
 * @param {boolean} filled
 */
function button(href, label, filled) {
  const background = filled ? "#4a3428" : "#fffdf8";
  const color = filled ? "#fffdf8" : "#2d211b";
  const border = filled ? "0" : "1px solid #e4dbc9";
  return `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td align="center" bgcolor="${background}" style="border-radius:999px;border:${border};">
                      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:20px;color:${color};text-decoration:none;border-radius:999px;">
                        ${escapeHtml(label)}
                      </a>
                    </td>
                  </tr>
                </table>`;
}

/**
 * @param {string} href
 * @param {string} label
 */
function textLink(href, label) {
  return `
                <p style="margin:18px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;">
                  <a href="${escapeHtml(href)}" style="color:#765548;text-decoration:underline;">${escapeHtml(label)}</a>
                </p>`;
}

/**
 * @param {string} value
 */
function oneLine(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
