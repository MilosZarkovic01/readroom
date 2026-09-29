import { expect, test } from "vitest";
import { assessChecks, mergePullRequest } from "../../src/lib/pull-request-merge";

test("treats a finished Test check as ready when there is no commit status", () => {
  expect(
    assessChecks([{ name: "Test", status: "completed", conclusion: "success" }], {
      state: "pending",
      totalCount: 0,
    }).state,
  ).toBe("ready");
});

test("waits while Test or a later check is still running", () => {
  expect(
    assessChecks([{ name: "CI/CD / Test", status: "in_progress", conclusion: null }], {
      state: "success",
      totalCount: 1,
    }).state,
  ).toBe("pending");

  expect(
    assessChecks(
      [
        { name: "Test", status: "completed", conclusion: "success" },
        { name: "Build", status: "in_progress", conclusion: null },
      ],
      { state: "success", totalCount: 0 },
    ).state,
  ).toBe("pending");
});

test("blocks when a check fails", () => {
  const result = assessChecks(
    [
      { name: "Test", status: "completed", conclusion: "success" },
      { name: "Build", status: "completed", conclusion: "failure" },
    ],
    { state: "success", totalCount: 0 },
  );
  expect(result.state).toBe("blocked");
  if (result.state === "blocked") expect(result.detail).toContain("Build");
});

test("merges a same-repo pull request after CI passes", async () => {
  const { fetchImpl, calls } = githubFetch();
  await expect(mergePullRequest(12, "token", fetchImpl)).resolves.toEqual({ ok: true });
  const mergeCall = calls.find((call) => call.method === "POST");
  expect(mergeCall?.url).toContain("/pulls/12/merge");
  expect(mergeCall?.body).toContain('"merge_method":"merge"');
});

test("does not merge when CI is still running or the pull request is from a fork", async () => {
  const pending = githubFetch({
    checks: [{ name: "Test", status: "in_progress", conclusion: null }],
  });
  await expect(mergePullRequest(12, "token", pending.fetchImpl)).resolves.toEqual({
    ok: false,
    notice: "pending",
  });
  expect(pending.calls.some((call) => call.method === "POST")).toBe(false);

  const fork = githubFetch({
    pull: { head: { sha: "abc123", repo: { full_name: "other/readroom" } } },
  });
  await expect(mergePullRequest(12, "token", fork.fetchImpl)).resolves.toEqual({
    ok: false,
    notice: "blocked",
  });
  expect(fork.calls.some((call) => call.method === "POST")).toBe(false);
});

function githubFetch({
  checks = [{ name: "Test", status: "completed", conclusion: "success" }],
  pull = {},
}: {
  checks?: Array<{ name: string; status: string; conclusion: string | null }>;
  pull?: Record<string, unknown>;
} = {}) {
  const calls: Array<{ method: string; url: string; body: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: typeof init?.body === "string" ? init.body : "" });
    if (url.endsWith("/pulls/12") && method === "GET") {
      return Response.json({
        title: "Add shelves",
        state: "open",
        draft: false,
        merged: false,
        html_url: "https://github.com/MilosZarkovic01/readroom/pull/12",
        user: { login: "MilosZarkovic01" },
        base: { ref: "master" },
        head: { sha: "abc123", repo: { full_name: "MilosZarkovic01/readroom" } },
        ...pull,
      });
    }
    if (url.includes("/check-runs")) {
      return Response.json({ check_runs: checks });
    }
    if (url.endsWith("/status")) {
      return Response.json({ state: "success", total_count: 0 });
    }
    if (url.includes("/deployments?")) {
      return Response.json([{ id: 9, environment: "Preview" }]);
    }
    if (url.includes("/statuses")) {
      return Response.json([
        {
          state: "success",
          environment_url: "https://readroom-git-feature.vercel.app",
        },
      ]);
    }
    if (url.endsWith("/merge") && method === "POST") {
      return Response.json({ merged: true });
    }
    return Response.json({ message: "missing" }, { status: 404 });
  };
  return { fetchImpl, calls };
}
