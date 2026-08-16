const ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

export const RESERVED_EMBED_IDS = new Set([
  "login",
  "grid",
  "admin",
  "account",
  "embed",
  "api",
  "me",
  "auth",
]);

export function parsePageUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("url must be an absolute http(s) address");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("url must be http or https");
  }
  url.hash = "";
  url.username = "";
  url.password = "";
  return url.href;
}

export function slugifyId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (!ID_RE.test(slug)) {
    throw new Error("id must match [a-z][a-z0-9-]{0,31}");
  }
  return slug;
}

export function assertEmbedId(id: string, taken: Set<string>): string {
  if (!ID_RE.test(id)) {
    throw new Error("id must match [a-z][a-z0-9-]{0,31}");
  }
  if (RESERVED_EMBED_IDS.has(id) || taken.has(id)) {
    throw new Error(`id "${id}" is reserved or already used`);
  }
  return id;
}
