import { expect, test } from "vitest";
import { buildReviewEmail } from "../../src/lib/review-email.mjs";
import { findPreviewUrl, waitForPreviewUrl } from "../../src/lib/preview-url.mjs";

test("builds a polished email with a merge button and an escaped title", () => {
  const message = buildReviewEmail({
    title: "Add <shelves> & quotes",
    url: "https://github.com/MilosZarkovic01/readroom/pull/12",
    number: "12",
    author: "MilosZarkovic01",
    previewUrl: "https://readroom-git-feature.vercel.app",
    mergeUrl: "https://readroom-gamma.vercel.app/review/merge?pr=12&exp=1&sig=abc",
  });

  expect(message.subject).toBe("ReadRoom preview is ready: Add <shelves> & quotes");
  expect(message.html).toContain("Merge pull request");
  expect(message.html).toContain("Open Vercel preview");
  expect(message.html).toContain("https://readroom-gamma.vercel.app/review/merge?pr=12&amp;exp=1&amp;sig=abc");
  expect(message.html).not.toContain("<shelves>");
  expect(message.html).toContain("Add &lt;shelves&gt; &amp; quotes");
  expect(message.text).toContain("https://readroom-git-feature.vercel.app");
});

test("drops unsafe preview and merge links", () => {
  const message = buildReviewEmail({
    title: "Notes",
    url: "https://github.com/MilosZarkovic01/readroom/pull/4",
    number: "4",
    author: "reader",
    previewUrl: "https://evil.example/phish",
    mergeUrl: "https://evil.example/merge",
  });

  expect(message.html).toContain("Open pull request");
  expect(message.html).not.toContain("evil.example");
  expect(message.html).not.toContain("Merge pull request");
});

test("reads a successful Vercel preview URL and ignores production", async () => {
  const fetchImpl = mockFetch({
    deployments: [
      { id: 2, environment: "Production" },
      { id: 9, environment: "Preview" },
    ],
    statuses: {
      9: [
        {
          state: "success",
          environment_url: "https://readroom-git-feature.vercel.app/",
          target_url: "https://vercel.com/team/readroom/deployments/9",
        },
      ],
    },
  });

  await expect(findPreviewUrl("MilosZarkovic01/readroom", "abc", "token", fetchImpl)).resolves.toBe(
    "https://readroom-git-feature.vercel.app/",
  );
});

test("stops waiting immediately when GitHub credentials are missing", async () => {
  let slept = false;
  const url = await waitForPreviewUrl("repo", "", "", {
    timeoutMs: 180_000,
    sleep: async () => {
      slept = true;
    },
  });
  expect(url).toBe("");
  expect(slept).toBe(false);
});

function mockFetch({
  deployments,
  statuses,
}: {
  deployments: Array<{ id: number; environment: string }>;
  statuses: Record<number, unknown[]>;
}): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.includes("/statuses")) {
      const id = Number(url.match(/deployments\/(\d+)/)?.[1]);
      return Response.json(statuses[id] ?? []);
    }
    return Response.json(deployments);
  };
}
