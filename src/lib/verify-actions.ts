"use server";

import { redirect } from "next/navigation";
import {
  getPendingSignup,
  sendSignupVerification,
  verifySignupCode,
} from "@/lib/email-verify";

export async function resendSignupVerificationAction() {
  const pending = await getPendingSignup();
  if (!pending) {
    return { error: "Your verification session expired. Register again." };
  }
  const result = await sendSignupVerification(pending.email);
  if ("alreadyVerified" in result && result.alreadyVerified) {
    return { error: "This email is already verified. Please log in." };
  }
  if ("error" in result && result.error) return { error: result.error };
  return { message: "We sent a new verification code." };
}

export async function verifySignupAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const code = String(formData.get("code") ?? "");
  const result = await verifySignupCode(code);
  if ("error" in result && result.error) return { error: result.error };
  redirect("/login?verified=1");
}
