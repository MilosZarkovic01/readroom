import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail, verificationEmail } from "@/lib/mail";

const CODE_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 8;
const MAX_ATTEMPTS = 5;
const PENDING_COOKIE = "rr_reset_pending";
const VERIFIED_COOKIE = "rr_reset_verified";

const SUCCESS_MESSAGE =
  "If an account exists for that email, we sent a verification code.";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

function hashCode(code: string) {
  return createHash("sha256").update(`${secret()}:${code}`).digest("hex");
}

function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signPayload(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readPayload<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & {
      exp?: number;
    };
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function clientIp() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function getPendingReset() {
  const jar = await cookies();
  return readPayload<{ email: string }>(jar.get(PENDING_COOKIE)?.value);
}

export async function getVerifiedReset() {
  const jar = await cookies();
  return readPayload<{ email: string }>(jar.get(VERIFIED_COOKIE)?.value);
}

async function setPendingCookie(email: string) {
  const jar = await cookies();
  jar.set(
    PENDING_COOKIE,
    signPayload({ email, exp: Date.now() + CODE_TTL_MS }),
    cookieOptions(Math.ceil(CODE_TTL_MS / 1000)),
  );
  jar.delete(VERIFIED_COOKIE);
}

async function setVerifiedCookie(email: string) {
  const jar = await cookies();
  jar.set(
    VERIFIED_COOKIE,
    signPayload({ email, exp: Date.now() + VERIFIED_TTL_MS }),
    cookieOptions(Math.ceil(VERIFIED_TTL_MS / 1000)),
  );
  jar.delete(PENDING_COOKIE);
}

export async function clearResetCookies() {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
  jar.delete(VERIFIED_COOKIE);
}

async function tooManyRequests(email: string, ip: string) {
  const since = new Date(Date.now() - EMAIL_WINDOW_MS);
  const [emailCount, ipCount] = await Promise.all([
    prisma.passwordReset.count({ where: { email, createdAt: { gte: since } } }),
    prisma.passwordReset.count({ where: { ip, createdAt: { gte: since } } }),
  ]);
  return emailCount >= MAX_PER_EMAIL || ipCount >= MAX_PER_IP;
}

export async function requestPasswordReset(email: string) {
  if (!isEmailConfigured()) {
    return { error: "Password reset email could not be sent. Try again later." };
  }
  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const ip = await clientIp();
  if (await tooManyRequests(email, ip)) {
    return { error: "Too many reset attempts. Try again in a few minutes." };
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  if (user) {
    await prisma.passwordReset.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  await prisma.passwordReset.create({
    data: {
      email,
      codeHash: hashCode(code),
      ip,
      expiresAt,
    },
  });

  if (user) {
    try {
      await sendEmail({ to: email, ...verificationEmail(code) });
    } catch (error) {
      console.error("Failed to send password reset email");
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }

  await setPendingCookie(email);
  return { ok: true as const, message: SUCCESS_MESSAGE };
}

export async function verifyResetCode(code: string) {
  const pending = await getPendingReset();
  if (!pending) {
    return { error: "Your reset session expired. Request a new code." };
  }

  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return { error: "Enter the 6-digit verification code." };
  }

  const reset = await prisma.passwordReset.findFirst({
    where: { email: pending.email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!reset) {
    return { error: "This code is invalid or has expired. Request a new one." };
  }
  if (reset.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { consumedAt: new Date() },
    });
    return { error: "This code has expired. Request a new one." };
  }
  if (reset.attempts >= MAX_ATTEMPTS) {
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { consumedAt: new Date() },
    });
    return { error: "Too many incorrect attempts. Request a new code." };
  }

  if (!hashesMatch(reset.codeHash, hashCode(normalized))) {
    const attempts = reset.attempts + 1;
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: {
        attempts,
        consumedAt: attempts >= MAX_ATTEMPTS ? new Date() : undefined,
      },
    });
    if (attempts >= MAX_ATTEMPTS) {
      return { error: "Too many incorrect attempts. Request a new code." };
    }
    return { error: "That code is incorrect. Try again or request a new one." };
  }

  await prisma.passwordReset.update({
    where: { id: reset.id },
    data: { consumedAt: new Date() },
  });
  await setVerifiedCookie(pending.email);
  return { ok: true as const };
}

export async function setNewPassword(password: string) {
  const verified = await getVerifiedReset();
  if (!verified) {
    return { error: "Your verification expired. Start the reset again." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const user = await prisma.user.findUnique({ where: { email: verified.email } });
  if (!user) {
    await clearResetCookies();
    return { error: "Your verification expired. Start the reset again." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    }),
    prisma.passwordReset.updateMany({
      where: { email: verified.email, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);
  await clearResetCookies();
  return { ok: true as const, email: user.email };
}
