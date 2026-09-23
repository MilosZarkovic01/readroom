"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/lib/actions";
import { IconLogo } from "@/components/Icons";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mx-auto w-full max-w-[430px] space-y-4 px-6 py-10">
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
  );
}
