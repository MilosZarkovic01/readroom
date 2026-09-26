"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "@/components/Icons";
import { NotificationCard } from "@/components/NotificationCard";
import type { LiveNotification } from "@/lib/notification-bus";

const seen = new Set<string>();
let primed = false;

export function NotificationBell({ unread }: { unread: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const [count, setCount] = useState(pathname === "/notifications" ? 0 : unread);
  const [toasts, setToasts] = useState<LiveNotification[]>([]);

  pathnameRef.current = pathname;

  useEffect(() => {
    setCount(pathname === "/notifications" ? 0 : unread);
  }, [unread, pathname]);

  useEffect(() => {
    function receive(payload: LiveNotification) {
      if (seen.has(payload.id)) return;
      seen.add(payload.id);
      setToasts((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, 3));
      if (pathnameRef.current === "/notifications") {
        router.refresh();
      } else {
        setCount((value) => value + 1);
      }
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== payload.id));
      }, 7000);
    }

    let source: EventSource | null = null;
    let retry: number | undefined;
    let closed = false;

    function connect() {
      if (closed) return;
      source = new EventSource("/api/notifications/stream");
      source.addEventListener("notification", (event: MessageEvent) => {
        receive(JSON.parse(event.data) as LiveNotification);
      });
      source.onerror = () => {
        source?.close();
        if (!closed) retry = window.setTimeout(connect, 2000);
      };
    }

    async function pull() {
      try {
        const response = await fetch("/api/notifications/live");
        if (!response.ok) return;
        const payload = (await response.json()) as {
          unread: number;
          items: LiveNotification[];
        };
        if (!primed) {
          primed = true;
          payload.items.forEach((item) => seen.add(item.id));
          if (pathnameRef.current !== "/notifications") setCount(payload.unread);
          return;
        }
        payload.items.forEach((item) => receive(item));
        if (pathnameRef.current !== "/notifications") setCount(payload.unread);
      } catch {
        /* keep the open stream */
      }
    }

    connect();
    void pull();
    const poll = window.setInterval(() => void pull(), 4000);

    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      window.clearInterval(poll);
      source?.close();
    };
  }, [router]);

  return (
    <div className="relative font-sans">
      <Link
        href="/notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-cream text-walnut transition-colors hover:bg-beige/70"
        aria-label={count ? `${count} notifications` : "Notifications"}
      >
        <IconBell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-medium leading-none text-ivory">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Link>
      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed top-[4.75rem] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-5">
          <div className="pointer-events-auto flex w-full flex-col gap-2.5">
            {toasts.map((toast) => (
              <div key={toast.id} className="notify-pop">
                <NotificationCard
                  item={toast}
                  compact
                  onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
