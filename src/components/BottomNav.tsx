"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconFriends, IconHome, IconLibrary, IconProfile, IconSearch } from "@/components/Icons";

const ITEMS = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/friends", label: "Friends", icon: IconFriends },
  { href: "/library", label: "Library", icon: IconLibrary },
  { href: "/profile", label: "Profile", icon: IconProfile },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-beige bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-5 px-1 pt-2 pb-3">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href) || (item.href === "/friends" && pathname.startsWith("/u/"));
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
  );
}
