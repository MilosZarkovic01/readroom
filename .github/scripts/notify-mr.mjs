import nodemailer from "nodemailer";
import { buildMergeUrl } from "../../src/lib/merge-link.mjs";
import { waitForPreviewUrl } from "../../src/lib/preview-url.mjs";
import { buildReviewEmail } from "../../src/lib/review-email.mjs";

const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL", "MR_URL"];

for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.log(`Skipping review email; ${name} is not set.`);
    process.exit(0);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const title = process.env.MR_TITLE || "ReadRoom merge request";
const url = process.env.MR_URL;
const number = process.env.MR_NUMBER || "";
const author = process.env.MR_AUTHOR || "unknown";
const from = process.env.EMAIL_FROM || `ReadRoom <${process.env.SMTP_USER}>`;
const prNumber = Number(number);
const mergeUrl = buildMergeUrl({
  secret: process.env.MERGE_LINK_SECRET,
  pr: prNumber,
});
const previewUrl = await waitForPreviewUrl(
  process.env.GITHUB_REPOSITORY || "",
  process.env.PR_SHA || "",
  process.env.GITHUB_TOKEN || "",
);

if (mergeUrl) {
  console.log("Merge link included.");
} else {
  console.log("Merge link omitted; MERGE_LINK_SECRET is not set.");
}
if (previewUrl) {
  console.log("Vercel preview link included.");
} else {
  console.log("Vercel preview was not ready; email sent without it.");
}

const message = buildReviewEmail({
  title,
  url,
  number,
  author,
  previewUrl,
  mergeUrl,
});

await transporter.sendMail({
  from,
  to: process.env.NOTIFY_EMAIL,
  subject: message.subject,
  text: message.text,
  html: message.html,
});

console.log("Review email sent.");
