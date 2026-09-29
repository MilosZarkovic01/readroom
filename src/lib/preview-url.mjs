import { safeHttpsUrl } from "./safe-url.mjs";

const VERCEL_HOSTS = ["*.vercel.app"];

/**
 * @param {string} environment
 */
export function isPreviewEnvironment(environment) {
  const value = environment.trim().toLowerCase();
  return value === "preview" || value.startsWith("preview");
}

/**
 * @param {string} repo
 * @param {string} sha
 * @param {string} token
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string>}
 */
export async function findPreviewUrl(repo, sha, token, fetchImpl = fetch) {
  if (!repo || !sha || !token) return "";
  try {
    const headers = githubHeaders(token);
    const deploymentsResponse = await fetchImpl(
      `https://api.github.com/repos/${repo}/deployments?sha=${encodeURIComponent(sha)}&per_page=20`,
      { headers },
    );
    if (!deploymentsResponse.ok) return "";
    const deployments = await deploymentsResponse.json();
    if (!Array.isArray(deployments)) return "";

    for (const deployment of deployments) {
      const environment = String(deployment?.environment ?? "");
      if (!isPreviewEnvironment(environment) || !deployment?.id) continue;
      const statusResponse = await fetchImpl(
        `https://api.github.com/repos/${repo}/deployments/${deployment.id}/statuses`,
        { headers },
      );
      if (!statusResponse.ok) continue;
      const statuses = await statusResponse.json();
      const latest = Array.isArray(statuses) ? statuses[0] : null;
      if (!latest || latest.state !== "success") continue;
      const preview =
        safeHttpsUrl(latest.environment_url, VERCEL_HOSTS) ||
        safeHttpsUrl(latest.target_url, VERCEL_HOSTS);
      if (preview) return preview;
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * @param {string} repo
 * @param {string} sha
 * @param {string} token
 * @param {{ fetchImpl?: typeof fetch; timeoutMs?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void>; now?: () => number }} [options]
 * @returns {Promise<string>}
 */
export async function waitForPreviewUrl(repo, sha, token, options = {}) {
  if (!repo || !sha || !token) return "";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 180_000;
  const intervalMs = options.intervalMs ?? 15_000;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const started = now();

  for (;;) {
    const url = await findPreviewUrl(repo, sha, token, fetchImpl);
    if (url) return url;
    if (now() - started >= timeoutMs) return "";
    await sleep(intervalMs);
  }
}

/**
 * @param {string} token
 */
function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "readroom",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
