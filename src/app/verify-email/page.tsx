import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";
import { getPendingSignup } from "@/lib/email-verify";

export default async function VerifyEmailPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const pending = await getPendingSignup();
  if (!pending) redirect("/register");
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      <VerifyEmailForm />
    </div>
  );
}
