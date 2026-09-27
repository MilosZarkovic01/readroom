import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthFrame } from "@/components/AuthFrame";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { getVerifiedReset } from "@/lib/password-reset";

export default async function ResetPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const verified = await getVerifiedReset();
  if (!verified) redirect("/forgot-password");
  return (
    <AuthFrame>
      <NewPasswordForm />
    </AuthFrame>
  );
}
