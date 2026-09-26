const MESSAGES: Record<string, string> = {
  AccessDenied: "Google sign-in was cancelled.",
  OAuthCallback: "Google sign-in failed. Try again.",
  OAuthCallbackError: "Google sign-in failed. Try again.",
  OAuthAccountNotLinked: "This email already has a ReadRoom account. Log in with email and password.",
  Configuration: "Google sign-in is not configured.",
  CallbackRouteError: "Google sign-in failed. Try again.",
  google: "Google sign-in failed. Try again.",
};

export function oauthErrorMessage(code?: string) {
  if (!code) return undefined;
  return MESSAGES[code] ?? "Google sign-in failed. Try again.";
}
