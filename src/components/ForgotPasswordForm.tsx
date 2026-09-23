"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction } from "@/lib/reset-actions";
import { IconLogo } from "@/components/Icons";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestResetAction, undefined);

  return (
    <form action={formAction} className="mx-auto w-full max-w-[430px] space-y-4 px-6 py-10">
      <div className="mb-4 flex flex-col items-center text-center">
        <IconLogo className="h-12 w-12 text-espresso" />
        <h1 className="mt-3 font-serif text-4xl text-espresso">Forgot password</h1>
        <p className="mt-2 text-sm text-warm-gray">
          Enter your email and we will send a verification code.
        </p>
      </div>
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
      {state?.error ? <p className="text-sm text-terracotta">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-deep-brown py-3.5 font-medium text-ivory disabled:opacity-50"
      >
        {pending ? "Please wait…" : "Send code"}
      </button>
      <Link
        href="/login"
        className="block w-full rounded-full border border-beige py-3.5 text-center font-medium text-espresso"
      >
        Back to log in
      </Link>
    </form>
  );
}
