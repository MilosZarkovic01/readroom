import { REVIEW_REPOSITORY } from "./merge-link.mjs";
import { findPreviewUrl } from "./preview-url.mjs";

export type CheckRun = {
  name: string;
  status: string;
  conclusion: string | null;
};

export type CommitStatusSummary = {
  state: string;
  totalCount: number;
};

export type CheckAssessment =
  | { state: "ready" }
  | { state: "pending"; detail: string }
  | { state: "blocked"; detail: string };

const FAILED_CONCLUSIONS = new Set(["failure", "cancelled", "timed_out", "action_required"]);

export function assessChecks(checkRuns: CheckRun[], commitStatus: CommitStatusSummary): CheckAssessment {
  const tests = checkRuns.filter((check) => isTestCheck(check.name));
  if (tests.length === 0 || tests.some((check) => check.status !== "completed")) {
    return {
      state: "pending",
      detail: "CI is still running. Refresh this page after the Test check finishes.",
    };
  }
  if (tests.some((check) => check.conclusion !== "success")) {
    return {
      state: "blocked",
      detail: "The Test check did not pass, so this pull request cannot be merged from email.",
    };
  }

  const failed = checkRuns.filter(
    (check) => check.status === "completed" && FAILED_CONCLUSIONS.has(check.conclusion ?? ""),
  );
  if (failed.length > 0) {
    const names = failed.map((check) => check.name).join(", ");
    return {
      state: "blocked",
      detail: `These checks failed: ${names}.`,
    };
  }

  const incomplete = checkRuns.filter((check) => check.status !== "completed");
  if (incomplete.length > 0) {
    return {
      state: "pending",
      detail: "Some checks are still running. Refresh this page when they finish.",
    };
  }

  if (commitStatus.totalCount > 0 && commitStatus.state === "pending") {
    return {
      state: "pending",
      detail: "A commit status is still running. Refresh this page when it finishes.",
    };
  }
  if (
    commitStatus.totalCount > 0 &&
    (commitStatus.state === "failure" || commitStatus.state === "error")
  ) {
    return {
      state: "blocked",
      detail: "A commit status failed, so this pull request cannot be merged from email.",
    };
  }

  return { state: "ready" };
}

export type PullReview =
  | { kind: "not-found" }
  | { kind: "unauthorized" }
  | { kind: "error" }
  | {
      kind: "pull";
      number: number;
      title: string;
      author: string;
      url: string;
      previewUrl: string;
      phase: "draft" | "merged" | "closed" | "open" | "refused";
      checks: "ready" | "pending" | "blocked" | "none";
      detail: string;
      canMerge: boolean;
    };

export type MergeResult = { ok: true } | { ok: false; notice: MergeNotice };

export type MergeNotice =
  | "not-found"
  | "unauthorized"
  | "pending"
  | "blocked"
  | "rejected"
  | "unconfigured";

type GitHubPull = {
  title?: string;
  state?: string;
  draft?: boolean;
  merged?: boolean;
  html_url?: string;
  user?: { login?: string } | null;
  base?: { ref?: string };
  head?: { sha?: string; repo?: { full_name?: string } | null };
};

export async function loadPullRequestReview(
  pr: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PullReview> {
  const pullResponse = await githubRequest<GitHubPull>(
    fetchImpl,
    token,
    `/repos/${REVIEW_REPOSITORY}/pulls/${pr}`,
  );
  if (!pullResponse.ok) return failureKind(pullResponse.status);

  const pull = pullResponse.data;
  const sha = pull.head?.sha ?? "";
  const author = pull.user?.login || "unknown";
  const url = pull.html_url || `https://github.com/${REVIEW_REPOSITORY}/pull/${pr}`;
  const title = pull.title || `Pull request #${pr}`;
  const shared = {
    kind: "pull" as const,
    number: pr,
    title,
    author,
    url,
    previewUrl: "",
    checks: "none" as const,
    canMerge: false,
  };

  if (pull.merged) {
    return { ...shared, phase: "merged", detail: "This pull request is already on master." };
  }
  if (pull.state === "closed") {
    return { ...shared, phase: "closed", detail: "This pull request is closed." };
  }
  if (pull.draft) {
    return { ...shared, phase: "draft", detail: "This pull request is still a draft." };
  }
  if (pull.base?.ref !== "master" || pull.head?.repo?.full_name !== REVIEW_REPOSITORY) {
    return {
      ...shared,
      phase: "refused",
      detail: "Only pull requests from this repository into master can be merged from email.",
    };
  }
  if (!sha) return { kind: "error" };

  const [checksResponse, statusResponse, previewUrl] = await Promise.all([
    githubRequest<{ check_runs?: CheckRun[] }>(
      fetchImpl,
      token,
      `/repos/${REVIEW_REPOSITORY}/commits/${sha}/check-runs?per_page=100`,
    ),
    githubRequest<{ state?: string; total_count?: number }>(
      fetchImpl,
      token,
      `/repos/${REVIEW_REPOSITORY}/commits/${sha}/status`,
    ),
    findPreviewUrl(REVIEW_REPOSITORY, sha, token, fetchImpl),
  ]);
  if (!checksResponse.ok) return failureKind(checksResponse.status);
  if (!statusResponse.ok) return failureKind(statusResponse.status);

  const assessment = assessChecks(checksResponse.data.check_runs ?? [], {
    state: statusResponse.data.state ?? "pending",
    totalCount: statusResponse.data.total_count ?? 0,
  });
  return {
    ...shared,
    previewUrl,
    phase: "open",
    checks: assessment.state,
    detail:
      assessment.state === "ready"
        ? "CI has passed. Confirm below to merge into master."
        : assessment.detail,
    canMerge: assessment.state === "ready",
  };
}

export async function mergePullRequest(
  pr: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MergeResult> {
  const review = await loadPullRequestReview(pr, token, fetchImpl);
  if (review.kind !== "pull") {
    if (review.kind === "not-found") return { ok: false, notice: "not-found" };
    if (review.kind === "unauthorized") return { ok: false, notice: "unauthorized" };
    return { ok: false, notice: "rejected" };
  }
  if (review.phase === "merged") return { ok: true };
  if (review.checks === "pending") return { ok: false, notice: "pending" };
  if (!review.canMerge) return { ok: false, notice: "blocked" };

  for (const mergeMethod of ["merge", "squash", "rebase"] as const) {
    const response = await githubRequest<{ merged?: boolean; message?: string }>(
      fetchImpl,
      token,
      `/repos/${REVIEW_REPOSITORY}/pulls/${pr}/merge`,
      {
        method: "POST",
        body: JSON.stringify({ merge_method: mergeMethod }),
      },
    );
    if (response.ok) {
      return response.data.merged === false ? { ok: false, notice: "rejected" } : { ok: true };
    }
    if (response.status === 401 || response.status === 403) return { ok: false, notice: "unauthorized" };
    if (response.status === 404) return { ok: false, notice: "not-found" };
    if (mergeMethod !== "rebase" && isMethodRejected(response)) continue;
    return { ok: false, notice: "rejected" };
  }
  return { ok: false, notice: "rejected" };
}

function isTestCheck(name: string) {
  return name === "Test" || name.endsWith(" / Test");
}

function failureKind(status: number): PullReview {
  if (status === 404) return { kind: "not-found" };
  if (status === 401 || status === 403) return { kind: "unauthorized" };
  return { kind: "error" };
}

function isMethodRejected(response: { ok: boolean; status: number; data?: { message?: string } }) {
  if (response.ok || response.status !== 405) return false;
  const message = response.data?.message?.toLowerCase() ?? "";
  return message.includes("not allowed") || message.includes("method");
}

type GithubSuccess<T> = { ok: true; status: number; data: T };
type GithubFailure = { ok: false; status: number; data?: { message?: string } };

async function githubRequest<T>(
  fetchImpl: typeof fetch,
  token: string,
  path: string,
  init?: { method?: string; body?: string },
): Promise<GithubSuccess<T> | GithubFailure> {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method: init?.method ?? "GET",
    body: init?.body,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "readroom",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: data && typeof data === "object" ? (data as { message?: string }) : undefined,
    };
  }
  return { ok: true, status: response.status, data: data as T };
}
