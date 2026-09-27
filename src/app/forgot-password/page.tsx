import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthFrame } from "@/components/AuthFrame";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <AuthFrame>
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
