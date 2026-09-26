import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";
import { oauthErrorMessage } from "@/lib/oauth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { verified, error } = await searchParams;
  return (
    <div className="phone-shell mx-auto min-h-full max-w-[430px]">
      {verified ? (
        <p className="px-6 pt-8 text-center text-sm text-warm-gray">
          Email verified. Please log in.
        </p>
      ) : null}
      <AuthForm mode="login" oauthError={oauthErrorMessage(error)} />
    </div>
  );
}
