import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";
import { AuthFrame } from "@/components/AuthFrame";
import { isGoogleAuthEnabled } from "@/lib/google-auth";
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
    <AuthFrame>
      <AuthForm
        mode="register"
        googleEnabled={isGoogleAuthEnabled()}
        oauthError={oauthErrorMessage(error)}
      />
    </AuthFrame>
  );
}
