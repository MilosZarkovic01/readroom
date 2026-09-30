"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowButton({
  userId,
  initialFollowing,
  size = "md",
}: {
  userId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      const response = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) setFollowing(!next);
      else router.refresh();
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  const box = size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={`shrink-0 rounded-full border font-medium disabled:opacity-50 ${box} ${
        following ? "border-beige text-espresso" : "border-deep-brown bg-deep-brown text-ivory"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
