import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthFrame } from "@/components/AuthFrame";
import { VerifyResetCodeForm } from "@/components/VerifyResetCodeForm";
import { getPendingReset } from "@/lib/password-reset";

export default async function VerifyResetPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const pending = await getPendingReset();
  if (!pending) redirect("/forgot-password");
  return (
    <AuthFrame>
      <VerifyResetCodeForm />
    </AuthFrame>
  );
}
