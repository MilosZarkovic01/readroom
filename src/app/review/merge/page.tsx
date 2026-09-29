import type { Metadata } from "next";
import type { ReactNode } from "react";
import { githubPullUrl, verifyMergeLink } from "@/lib/merge-link.mjs";
import { loadPullRequestReview, type PullReview } from "@/lib/pull-request-merge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merge pull request",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const NOTICE_COPY: Record<string, string> = {
  confirm: "Check the box to confirm, then merge.",
  pending: "CI is still running, so nothing was merged.",
  blocked: "CI has not passed, so nothing was merged.",
  rejected: "GitHub did not merge this pull request. You can still merge it on GitHub.",
  unauthorized: "GitHub refused the merge token. You can still merge on GitHub.",
  unconfigured: "This page cannot merge yet. You can still merge on GitHub.",
  merged: "Merged into master.",
};

export default async function MergeReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ pr?: string; exp?: string; sig?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const secret = process.env.MERGE_LINK_SECRET?.trim() ?? "";
  const verified = verifyMergeLink({
    secret,
    pr: params.pr ?? "",
    exp: params.exp ?? "",
    sig: params.sig ?? "",
  });
  const notice = NOTICE_COPY[params.notice ?? ""] ?? "";

  if (!verified.ok) {
    return (
      <Shell>
        <h1 className="mt-8 font-serif text-3xl leading-tight text-espresso">
          {verified.reason === "expired" ? "This merge link has expired" : "This merge link is not valid"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-warm-gray">
          {verified.reason === "expired"
            ? "Open the pull request on GitHub to merge it."
            : "Open the pull request from GitHub instead."}
        </p>
        {verified.reason === "expired" && verified.pr ? (
          <ActionLink href={githubPullUrl(verified.pr)} className="mt-6">
            View on GitHub
          </ActionLink>
        ) : null}
      </Shell>
    );
  }

  const token = process.env.GITHUB_MERGE_TOKEN?.trim() ?? "";
  if (!token) {
    return (
      <Shell>
        {notice ? <Notice>{notice}</Notice> : null}
        <h1 className="mt-8 font-serif text-3xl leading-tight text-espresso">
          Merge on GitHub
        </h1>
        <p className="mt-4 text-sm leading-6 text-warm-gray">
          This link is valid. Merging from here is not set up yet, so finish it on GitHub.
        </p>
        <ActionLink href={githubPullUrl(verified.pr)} className="mt-6">
          View on GitHub
        </ActionLink>
      </Shell>
    );
  }

  const review = await loadPullRequestReview(verified.pr, token);
  return (
    <Shell>
      {notice ? <Notice>{notice}</Notice> : null}
      <ReviewBody review={review} pr={verified.pr} exp={verified.exp} sig={params.sig ?? ""} />
    </Shell>
  );
}

function ReviewBody({
  review,
  pr,
  exp,
  sig,
}: {
  review: PullReview;
  pr: number;
  exp: number;
  sig: string;
}) {
  const githubUrl = githubPullUrl(pr);
  if (review.kind !== "pull") {
    const heading =
      review.kind === "not-found"
        ? "This pull request was not found"
        : review.kind === "unauthorized"
          ? "GitHub refused the merge token"
          : "GitHub could not be reached";
    const detail =
      review.kind === "error"
        ? "Refresh this page in a moment, or open the pull request on GitHub."
        : "Open the pull request on GitHub to continue.";
    return (
      <>
        <h1 className="mt-8 font-serif text-3xl leading-tight text-espresso">{heading}</h1>
        <p className="mt-4 text-sm leading-6 text-warm-gray">{detail}</p>
        <ActionLink href={githubUrl} className="mt-6">
          View on GitHub
        </ActionLink>
      </>
    );
  }

  return (
    <>
      <p className="mt-8 text-xs tracking-[0.16em] text-terracotta uppercase">
        {review.previewUrl ? "Preview deployment" : "Pull request"}
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-espresso">{review.title}</h1>
      <p className="mt-3 text-sm text-warm-gray">
        #{review.number} · {review.author}
      </p>
      <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm leading-6 text-warm-gray">{review.detail}</p>
      {review.canMerge ? (
        <form method="post" action="/api/review/merge" className="mt-6 space-y-4">
          <input type="hidden" name="pr" value={pr} />
          <input type="hidden" name="exp" value={exp} />
          <input type="hidden" name="sig" value={sig} />
          <label className="flex items-start gap-3 text-sm leading-6 text-espresso">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              required
              className="mt-1 h-4 w-4 accent-deep-brown"
            />
            <span>Merge this pull request into master.</span>
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-deep-brown py-3.5 text-sm font-medium text-ivory"
          >
            Merge into master
          </button>
        </form>
      ) : null}
      <div className="mt-6 space-y-3">
        {review.checks === "pending" ? (
          <ActionLink href={reviewPath(pr, exp, sig)}>Refresh status</ActionLink>
        ) : null}
        {review.previewUrl ? <ActionLink href={review.previewUrl}>Open Vercel preview</ActionLink> : null}
        <ActionLink href={review.url || githubUrl}>View on GitHub</ActionLink>
      </div>
    </>
  );
}

function reviewPath(pr: number, exp: number, sig: string) {
  const params = new URLSearchParams({
    pr: String(pr),
    exp: String(exp),
    sig,
  });
  return `/review/merge?${params.toString()}`;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
      <article className="rounded-[2rem] border border-beige bg-ivory px-7 py-9 shadow-[0_24px_80px_rgba(45,33,27,0.08)] sm:px-10 sm:py-11">
        <p className="font-serif text-[2rem] leading-none text-espresso">ReadRoom</p>
        {children}
      </article>
    </main>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="mt-8 text-sm leading-6 text-espresso">{children}</p>;
}

function ActionLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      rel="noreferrer"
      className={`block w-full rounded-full border border-beige py-3.5 text-center text-sm font-medium text-espresso ${className}`}
    >
      {children}
    </a>
  );
}
