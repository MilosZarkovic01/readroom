import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { getVerifiedReset } from "@/lib/password-reset";

export default async function ResetPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const verified = await getVerifiedReset();
  if (!verified) redirect("/forgot-password");
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      <NewPasswordForm />
    </div>
  );
}
