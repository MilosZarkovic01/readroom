import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      <ForgotPasswordForm />
    </div>
  );
}
