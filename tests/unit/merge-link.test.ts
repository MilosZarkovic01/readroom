import { expect, test } from "vitest";
import {
  MERGE_LINK_TTL_SECONDS,
  buildMergeUrl,
  signMergeLink,
  verifyMergeLink,
  REVIEW_REPOSITORY,
} from "../../src/lib/merge-link.mjs";

const secret = "test-merge-secret";
const now = Date.parse("2026-09-29T09:00:00.000Z");

test("signs a merge link that verifies", () => {
  const url = new URL(buildMergeUrl({ secret, pr: 12, now }));
  expect(url.origin).toBe("https://readroom-gamma.vercel.app");
  expect(url.pathname).toBe("/review/merge");
  expect(url.searchParams.get("pr")).toBe("12");
  const exp = Number(url.searchParams.get("exp"));
  expect(exp).toBe(Math.floor(now / 1000) + MERGE_LINK_TTL_SECONDS);
  expect(
    verifyMergeLink({
      secret,
      pr: 12,
      exp,
      sig: url.searchParams.get("sig") ?? "",
      now,
    }),
  ).toEqual({ ok: true, pr: 12, exp });
});

test("rejects a tampered or expired merge link", () => {
  const exp = Math.floor(now / 1000) + 60;
  const sig = signMergeLink({ secret, repo: REVIEW_REPOSITORY, pr: 12, exp });
  expect(verifyMergeLink({ secret, pr: 12, exp, sig: `${sig}x`, now }).ok).toBe(false);
  expect(verifyMergeLink({ secret, pr: 13, exp, sig, now })).toMatchObject({ ok: false, reason: "invalid" });
  expect(verifyMergeLink({ secret: "other-secret", pr: 12, exp, sig, now }).ok).toBe(false);
  expect(verifyMergeLink({ secret, pr: 12, exp, sig, now: (exp + 1) * 1000 })).toMatchObject({
    ok: false,
    reason: "expired",
    pr: 12,
  });
});

test("omits the merge link when the secret is missing", () => {
  expect(buildMergeUrl({ secret: "  ", pr: 12, now })).toBe("");
});
