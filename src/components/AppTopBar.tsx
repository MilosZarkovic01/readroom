import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IconLogo, IconSearch } from "@/components/Icons";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

export async function AppTopBar() {
  const session = await auth();
  const unread = session?.user?.id
    ? await prisma.notification.count({
        where: { userId: session.user.id, readAt: null },
      })
    : 0;

  return (
    <header className="relative z-30 flex items-center justify-between px-5 pt-5 pb-2 font-sans">
      <Link href="/" className="flex items-center gap-2 text-espresso">
        <IconLogo className="h-8 w-8" />
        <span className="font-serif text-[28px] leading-none tracking-tight">ReadRoom</span>
      </Link>
      <div className="flex items-center gap-2">
        <NotificationBell unread={unread} />
        <Link
          href="/search"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-walnut"
          aria-label="Search"
        >
          <IconSearch className="h-5 w-5" />
        </Link>
        <LogoutButton compact />
      </div>
    </header>
  );
}
