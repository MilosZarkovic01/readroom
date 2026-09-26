"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { resendSignupVerificationAction, verifySignupAction } from "@/lib/verify-actions";
import { IconLogo } from "@/components/Icons";

export function VerifyEmailForm({ inboxUrl }: { inboxUrl?: string }) {
  const [state, formAction, pending] = useActionState(verifySignupAction, undefined);
  const [resend, setResend] = useState<{ error?: string; message?: string; inboxUrl?: string }>();
  const [resending, setResending] = useState(false);
  const stgInbox = resend?.inboxUrl || inboxUrl;

  async function onResend() {
    setResending(true);
    try {
      setResend(await resendSignupVerificationAction());
    } finally {
      setResending(false);
    }
  }

  return (
    <form action={formAction} className="mx-auto w-full max-w-[430px] space-y-4 px-6 py-10">
      <div className="mb-4 flex flex-col items-center text-center">
        <IconLogo className="h-12 w-12 text-espresso" />
        <h1 className="mt-3 font-serif text-4xl text-espresso">Verify email</h1>
        <p className="mt-2 text-sm text-warm-gray">
          Check your email for a 6-digit verification code. It expires in 10 minutes.
        </p>
        {stgInbox ? (
          <p className="mt-3 text-sm text-warm-gray">
            STG does not deliver to a real inbox.{" "}
            <a className="font-medium text-espresso underline" href={stgInbox} target="_blank" rel="noreferrer">
              Open the STG verification email
            </a>{" "}
            to read the code.
          </p>
        ) : null}
      </div>
      <label className="block text-sm text-warm-gray">
        Verification code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          className="mt-1.5 w-full rounded-full border border-beige bg-ivory px-4 py-3 text-center text-2xl tracking-[0.35em] text-espresso outline-none focus:border-walnut"
        />
      </label>
      {state?.error ? <p className="text-sm text-terracotta">{state.error}</p> : null}
      {resend?.error ? <p className="text-sm text-terracotta">{resend.error}</p> : null}
      {resend?.message ? <p className="text-sm text-warm-gray">{resend.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-deep-brown py-3.5 font-medium text-ivory disabled:opacity-50"
      >
        {pending ? "Please wait…" : "Verify email"}
      </button>
      <button
        type="button"
        onClick={onResend}
        disabled={resending}
        className="w-full rounded-full border border-beige py-3.5 font-medium text-espresso disabled:opacity-50"
      >
        {resending ? "Please wait…" : "Request a new code"}
      </button>
      <p className="text-center text-sm text-warm-gray">
        <Link className="font-medium text-espresso" href="/login">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
