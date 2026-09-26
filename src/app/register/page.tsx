import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";
import { oauthErrorMessage } from "@/lib/oauth-errors";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      <AuthForm mode="register" oauthError={oauthErrorMessage(error)} />
    </div>
  );
}
