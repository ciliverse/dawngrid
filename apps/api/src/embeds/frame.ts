export type FrameStatus = "ok" | "blocked" | "unknown";

export function frameStatusFromHeaders(headers: { get(name: string): string | null }): FrameStatus {
  const xfo = (headers.get("x-frame-options") ?? "").trim().toLowerCase();
  if (xfo === "deny" || xfo === "sameorigin") return "blocked";

  const csp = headers.get("content-security-policy") ?? "";
  const ancestors = ancestorsDirective(csp);
  if (ancestors === null) return "ok";
  if (ancestors.includes("*")) return "ok";
  return "blocked";
}

function ancestorsDirective(csp: string): string[] | null {
  for (const part of csp.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.toLowerCase().startsWith("frame-ancestors")) continue;
    return trimmed
      .slice("frame-ancestors".length)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.toLowerCase());
  }
  return null;
}

export async function probeFrameStatus(
  href: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FrameStatus> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetchImpl(href, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Dawngrid-frame-probe" },
    });
    return frameStatusFromHeaders(res.headers);
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}
