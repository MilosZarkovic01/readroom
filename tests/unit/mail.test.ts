import { afterEach, expect, test } from "vitest";
import { isEmailConfigured } from "../../src/lib/mail";

const keys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const;

afterEach(() => {
  for (const key of keys) {
    delete process.env[key];
  }
});

test("reports email as unconfigured when SMTP settings are missing", () => {
  for (const key of keys) {
    delete process.env[key];
  }
  expect(isEmailConfigured()).toBe(false);
});

test("reports email as configured when host, user, and password are set", () => {
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_USER = "app@example.com";
  process.env.SMTP_PASS = "app-password";
  expect(isEmailConfigured()).toBe(true);
});
