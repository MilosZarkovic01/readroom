"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFriends,
  IconHome,
  IconLibrary,
  IconLogo,
  IconProfile,
  IconSearch,
} from "@/components/Icons";

const ITEMS = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/friends", label: "Friends", icon: IconFriends },
  { href: "/library", label: "Library", icon: IconLibrary },
  { href: "/profile", label: "Profile", icon: IconProfile },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href) || (href === "/friends" && pathname.startsWith("/u/"));
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-beige bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5 px-1 pt-2 pb-3">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 text-[10px] ${
                    active ? "text-espresso" : "text-warm-gray"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-beige bg-ivory px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-2 text-espresso">
          <IconLogo className="h-8 w-8" />
          <span className="font-serif text-[26px] leading-none tracking-tight">ReadRoom</span>
        </Link>
        <ul className="mt-8 flex flex-col gap-1">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
                    active ? "bg-cream font-medium text-espresso" : "text-warm-gray hover:bg-cream/80 hover:text-espresso"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
