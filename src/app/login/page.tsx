import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      <AuthForm mode="login" />
    </div>
  );
}
