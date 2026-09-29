import { createHmac, timingSafeEqual } from "node:crypto";
import { safeHttpsUrl } from "./safe-url.mjs";

export const REVIEW_REPOSITORY = "MilosZarkovic01/readroom";
export const REVIEW_APP_ORIGIN = "https://readroom-gamma.vercel.app";
export const MERGE_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * @param {{ secret: string; repo: string; pr: number; exp: number }} input
 */
export function signMergeLink({ secret, repo, pr, exp }) {
  const payload = `${repo}\n${pr}\n${exp}`;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * @param {{ secret: string; pr: string | number; exp: string | number; sig: string; now?: number }} input
 * @returns {{ ok: true; pr: number; exp: number } | { ok: false; reason: "invalid" | "expired"; pr?: number }}
 */
export function verifyMergeLink({ secret, pr, exp, sig, now = Date.now() }) {
  if (!secret || typeof sig !== "string" || !sig) return { ok: false, reason: "invalid" };
  const prNumber = typeof pr === "number" ? pr : Number(pr);
  const expNumber = typeof exp === "number" ? exp : Number(exp);
  if (!Number.isInteger(prNumber) || prNumber <= 0) return { ok: false, reason: "invalid" };
  if (!Number.isInteger(expNumber)) return { ok: false, reason: "invalid" };

  const expected = signMergeLink({
    secret,
    repo: REVIEW_REPOSITORY,
    pr: prNumber,
    exp: expNumber,
  });
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(sig);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (expNumber < Math.floor(now / 1000)) {
    return { ok: false, reason: "expired", pr: prNumber };
  }
  return { ok: true, pr: prNumber, exp: expNumber };
}

/**
 * @param {{ secret: string | undefined; pr: number; now?: number }} input
 * @returns {string}
 */
export function buildMergeUrl({ secret, pr, now = Date.now() }) {
  const trimmed = secret?.trim() ?? "";
  if (!trimmed || !Number.isInteger(pr) || pr <= 0) return "";
  const origin = safeHttpsUrl(REVIEW_APP_ORIGIN, ["readroom-gamma.vercel.app"]);
  if (!origin) return "";
  const exp = Math.floor(now / 1000) + MERGE_LINK_TTL_SECONDS;
  const sig = signMergeLink({
    secret: trimmed,
    repo: REVIEW_REPOSITORY,
    pr,
    exp,
  });
  const url = new URL("/review/merge", origin);
  url.searchParams.set("pr", String(pr));
  url.searchParams.set("exp", String(exp));
  url.searchParams.set("sig", sig);
  return url.toString();
}

/**
 * @param {number} pr
 */
export function githubPullUrl(pr) {
  return `https://github.com/${REVIEW_REPOSITORY}/pull/${pr}`;
}
