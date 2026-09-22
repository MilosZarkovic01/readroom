"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing: boolean;
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

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={
        following
          ? "rounded-full border border-beige px-4 py-2 text-sm font-medium text-espresso disabled:opacity-50"
          : "rounded-full bg-deep-brown px-4 py-2 text-sm font-medium text-ivory disabled:opacity-50"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
