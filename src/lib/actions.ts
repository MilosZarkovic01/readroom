"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { sendSignupVerification } from "@/lib/email-verify";
import { prisma } from "@/lib/prisma";

function parseCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  return { email, password, name };
}

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const { email, password } = parseCredentials(formData);
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { error: "Invalid email or password." };
    const result = await sendSignupVerification(email);
    if ("error" in result && result.error) return { error: result.error };
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
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function registerAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const { email, password, name } = parseCredentials(formData);

  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  if (existing && !existing.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name: name || existing.name },
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });
  }

  const result = await sendSignupVerification(email);
  if ("error" in result && result.error) return { error: result.error };
  redirect("/verify-email");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
