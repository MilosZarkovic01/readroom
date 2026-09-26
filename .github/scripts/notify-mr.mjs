import nodemailer from "nodemailer";

const required = [
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "NOTIFY_EMAIL",
  "MR_URL",
];

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

await transporter.sendMail({
  from,
  to: process.env.NOTIFY_EMAIL,
  subject: `ReadRoom MR ready for review: ${title}`,
  text: [
    "A merge request is ready for review.",
    "",
    `Title: ${title}`,
    `Author: ${author}`,
    `Number: #${number}`,
    `Link: ${url}`,
    "",
    "Approve it only after CI has passed. Do not merge unless you asked for the merge.",
  ].join("\n"),
});

console.log("Review email sent.");
