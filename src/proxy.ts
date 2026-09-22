export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/library/:path*",
    "/search/:path*",
    "/profile/:path*",
    "/friends/:path*",
    "/notifications/:path*",
    "/u/:path*",
  ],
};
