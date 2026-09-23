import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VerifyResetCodeForm } from "@/components/VerifyResetCodeForm";
import { getPendingReset } from "@/lib/password-reset";

export default async function VerifyResetPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const pending = await getPendingReset();
  if (!pending) redirect("/forgot-password");
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      <VerifyResetCodeForm />
    </div>
  );
}
