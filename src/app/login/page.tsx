import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";
import { isGoogleAuthEnabled } from "@/lib/google-auth";
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
    <AuthFrame>
      {verified ? (
        <p className="px-6 pt-8 text-center text-sm text-warm-gray lg:px-2 lg:pt-0 lg:pb-4">
          Email verified. Please log in.
        </p>
      ) : null}
      <AuthForm
        mode="login"
        googleEnabled={isGoogleAuthEnabled()}
        oauthError={oauthErrorMessage(error)}
      />
    </AuthFrame>
  );
}
