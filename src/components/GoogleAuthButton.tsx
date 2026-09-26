"use client";

import { googleAuthAction } from "@/lib/actions";

export function GoogleAuthButton({ mode }: { mode: "login" | "register" }) {
  return (
    <form action={googleAuthAction}>
      <input type="hidden" name="mode" value={mode} />
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-beige bg-ivory py-3.5 font-medium text-espresso"
      >
        <GoogleMark />
        Continue with Google
      </button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.2 2.8-2.5 3.6v3h4c2.3-2.1 3.5-5.3 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-4-3c-1.1.8-2.5 1.2-3.9 1.2-3 0-5.6-2-6.5-4.8H1.4v3.1C3.4 21.3 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.5 14.5c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1V7.2H1.4C.5 9 0 10.9 0 12.4c0 1.5.5 3.4 1.4 5.2l4.1-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 7.2l4.1 3.1C6.4 6.8 9 4.8 12 4.8z"
      />
    </svg>
  );
}
