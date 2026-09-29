import { NextResponse } from "next/server";
import { verifyMergeLink } from "@/lib/merge-link.mjs";
import { mergePullRequest } from "@/lib/pull-request-merge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const pr = String(form.get("pr") ?? "");
  const exp = String(form.get("exp") ?? "");
  const sig = String(form.get("sig") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const secret = process.env.MERGE_LINK_SECRET?.trim() ?? "";
  const verified = verifyMergeLink({ secret, pr, exp, sig });

  if (!verified.ok) {
    return redirectTo(request, "/review/merge");
  }

  const back = new URL("/review/merge", request.url);
  back.searchParams.set("pr", String(verified.pr));
  back.searchParams.set("exp", String(verified.exp));
  back.searchParams.set("sig", sig);

  if (confirm !== "yes") {
    back.searchParams.set("notice", "confirm");
    return redirectTo(request, back);
  }

  const token = process.env.GITHUB_MERGE_TOKEN?.trim() ?? "";
  if (!token) {
    back.searchParams.set("notice", "unconfigured");
    return redirectTo(request, back);
  }

  const result = await mergePullRequest(verified.pr, token);
  back.searchParams.set("notice", result.ok ? "merged" : result.notice);
  return redirectTo(request, back);
}

function redirectTo(request: Request, target: string | URL) {
  const url = typeof target === "string" ? new URL(target, request.url) : target;
  return NextResponse.redirect(url, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
