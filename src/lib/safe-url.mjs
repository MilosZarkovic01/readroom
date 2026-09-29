/**
 * @param {string | undefined | null} value
 * @param {string[]} allowedHosts Exact hosts, or suffixes written as `*.example.com`.
 * @returns {string}
 */
export function safeHttpsUrl(value, allowedHosts) {
  if (typeof value !== "string" || !value.trim()) return "";
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return "";
  }
  if (url.protocol !== "https:") return "";
  if (url.username || url.password) return "";
  const hostname = url.hostname.toLowerCase();
  const allowed = allowedHosts.some((rule) => {
    const normalized = rule.toLowerCase();
    if (normalized.startsWith("*.")) {
      const suffix = normalized.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname === normalized;
  });
  return allowed ? url.toString() : "";
}
