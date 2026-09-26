"use client";

import { useActionState } from "react";
import Link from "next/link";
import { googleAuthAction, loginAction, registerAction } from "@/lib/actions";
import { IconLogo } from "@/components/Icons";

export function AuthForm({
  mode,
  googleEnabled = false,
  oauthError,
}: {
  mode: "login" | "register";
  googleEnabled?: boolean;
  oauthError?: string;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-4 px-6 py-10">
    <form action={formAction} className="space-y-4">
      <div className="mb-4 flex flex-col items-center text-center">
        <IconLogo className="h-12 w-12 text-espresso" />
        <h1 className="mt-3 font-serif text-4xl text-espresso">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-warm-gray">
          {mode === "login"
            ? "Sign in to open your shelves."
            : "Better books. Bigger conversations."}
        </p>
      </div>
      {mode === "register" ? (
        <label className="block text-sm text-warm-gray">
          Name (optional)
          <input
            name="name"
            className="mt-1.5 w-full rounded-full border border-beige bg-ivory px-4 py-3 text-espresso outline-none focus:border-walnut"
            autoComplete="name"
          />
        </label>
      ) : null}
      <label className="block text-sm text-warm-gray">
        Email
        <input
          name="email"
          type="email"
          required
          className="mt-1.5 w-full rounded-full border border-beige bg-ivory px-4 py-3 text-espresso outline-none focus:border-walnut"
          autoComplete="email"
        />
      </label>
      <label className="block text-sm text-warm-gray">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          className="mt-1.5 w-full rounded-full border border-beige bg-ivory px-4 py-3 text-espresso outline-none focus:border-walnut"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {mode === "login" ? (
        <p className="-mt-1 text-right text-sm">
          <Link className="font-medium text-espresso" href="/forgot-password">
            Forgot password?
          </Link>
        </p>
      ) : null}
      {oauthError ? <p className="text-sm text-terracotta">{oauthError}</p> : null}
      {state?.error ? <p className="text-sm text-terracotta">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-deep-brown py-3.5 font-medium text-ivory disabled:opacity-50"
      >
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      {mode === "login" ? (
        <Link
          href="/register"
          className="block w-full rounded-full border border-beige py-3.5 text-center font-medium text-espresso"
        >
          Create account
        </Link>
      ) : (
        <p className="text-center text-sm text-warm-gray">
          Already have an account?{" "}
          <Link className="font-medium text-espresso" href="/login">
            Log in
          </Link>
        </p>
      )}
    </form>
      {googleEnabled ? (
        <>
          <p className="text-center text-sm text-warm-gray">or</p>
          <form action={googleAuthAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-beige bg-ivory py-3.5 font-medium text-espresso"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </form>
        </>
      ) : null}
    </div>
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
