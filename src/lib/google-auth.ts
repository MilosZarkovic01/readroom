import { prisma } from "@/lib/prisma";

export function isGoogleAuthEnabled() {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
}

export async function upsertGoogleUser(input: { email: string; name?: string | null }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: null,
      emailVerifiedAt: new Date(),
    },
  });
}
