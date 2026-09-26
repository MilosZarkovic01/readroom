import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail, signupVerificationEmail } from "@/lib/mail";

const CODE_TTL_MS = 10 * 60 * 1000;
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 8;
const MAX_ATTEMPTS = 5;
const PENDING_COOKIE = "rr_verify_pending";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

function hashCode(code: string) {
  return createHash("sha256").update(`${secret()}:signup:${code}`).digest("hex");
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

async function clientIp() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
}

export async function getPendingSignup() {
  const jar = await cookies();
  return readPayload<{ email: string; inboxUrl?: string }>(jar.get(PENDING_COOKIE)?.value);
}

async function setPendingCookie(email: string, inboxUrl?: string) {
  const jar = await cookies();
  jar.set(PENDING_COOKIE, signPayload({ email, inboxUrl, exp: Date.now() + PENDING_TTL_MS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(PENDING_TTL_MS / 1000),
  });
}

export async function clearSignupCookies() {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
}

async function tooManyRequests(email: string, ip: string) {
  const since = new Date(Date.now() - EMAIL_WINDOW_MS);
  const [emailCount, ipCount] = await Promise.all([
    prisma.emailVerification.count({ where: { email, createdAt: { gte: since } } }),
    prisma.emailVerification.count({ where: { ip, createdAt: { gte: since } } }),
  ]);
  return emailCount >= MAX_PER_EMAIL || ipCount >= MAX_PER_IP;
}

export async function sendSignupVerification(email: string) {
  if (!isEmailConfigured()) {
    return { error: "Verification email could not be sent. Try again later." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });
  if (!user) {
    return { error: "Your verification session expired. Register again." };
  }
  if (user.emailVerifiedAt) {
    return { alreadyVerified: true as const };
  }

  const ip = await clientIp();
  if (await tooManyRequests(email, ip)) {
    return { error: "Too many verification attempts. Try again in a few minutes." };
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.emailVerification.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.emailVerification.create({
    data: {
      email,
      codeHash: hashCode(code),
      ip,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  try {
    const sent = await sendEmail({ to: email, ...signupVerificationEmail(code) });
    await setPendingCookie(email, sent.inboxUrl);
    return { ok: true as const, inboxUrl: sent.inboxUrl };
  } catch (error) {
    console.error("Failed to send signup verification email");
    if (error instanceof Error) {
      console.error(error.message);
    }
    return { error: "Verification email could not be sent. Try again later." };
  }
}

export async function verifySignupCode(code: string) {
  const pending = await getPendingSignup();
  if (!pending) {
    return { error: "Your verification session expired. Register again." };
  }

  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return { error: "Enter the 6-digit verification code." };
  }

  const record = await prisma.emailVerification.findFirst({
    where: { email: pending.email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { error: "This code is invalid or has expired. Request a new one." };
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { error: "This code has expired. Request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { error: "Too many incorrect attempts. Request a new code." };
  }

  if (!hashesMatch(record.codeHash, hashCode(normalized))) {
    const attempts = record.attempts + 1;
    await prisma.emailVerification.update({
      where: { id: record.id },
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

  const user = await prisma.user.findUnique({ where: { email: pending.email } });
  if (!user) {
    await clearSignupCookies();
    return { error: "Your verification session expired. Register again." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);
  await clearSignupCookies();
  return { ok: true as const, email: user.email };
}
