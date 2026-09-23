"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { sendSignupVerification } from "@/lib/email-verify";
import { prisma } from "@/lib/prisma";
import {
  getPendingReset,
  getVerifiedReset,
  normalizeEmail,
  requestPasswordReset,
  setNewPassword,
  verifyResetCode,
} from "@/lib/password-reset";

export async function requestResetAction(
  _prev: { error?: string; message?: string } | undefined,
  formData: FormData,
) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const result = await requestPasswordReset(email);
  if ("error" in result && result.error) return { error: result.error };
  redirect("/forgot-password/verify");
}

export async function resendResetAction() {
  const pending = await getPendingReset();
  if (!pending) {
    return { error: "Your reset session expired. Request a new code." };
  }
  const result = await requestPasswordReset(pending.email);
  if ("error" in result && result.error) return { error: result.error };
  return { message: "If an account exists for that email, we sent a new code." };
}

export async function verifyResetAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const code = String(formData.get("code") ?? "");
  const result = await verifyResetCode(code);
  if ("error" in result && result.error) return { error: result.error };
  redirect("/forgot-password/reset");
}

export async function setPasswordAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const verified = await getVerifiedReset();
  if (!verified) {
    return { error: "Your verification expired. Start the reset again." };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const result = await setNewPassword(password);
  if ("error" in result && result.error) return { error: result.error };
  if (!("email" in result) || !result.email) {
    return { error: "Password updated. Please log in." };
  }

  const email = result.email;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerifiedAt: true },
  });
  if (user && !user.emailVerifiedAt) {
    const verify = await sendSignupVerification(email);
    if ("error" in verify && verify.error) return { error: verify.error };
    redirect("/verify-email");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Password updated. Please log in." };
    }
    throw error;
  }
}
