import { cellActive } from "./cells";

export const OPEN_PAGES_KEY = "dawngrid.island.open";

export function readOpenKeys(storage: { getItem(key: string): string | null }): string[] {
  try {
    const raw = storage.getItem(OPEN_PAGES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function writeOpenKeys(keys: string[], storage: { setItem(key: string, value: string): void }): void {
  storage.setItem(OPEN_PAGES_KEY, JSON.stringify(keys));
}

export function rememberOpen(keys: string[], key: string): string[] {
  if (keys.includes(key)) return keys;
  return [...keys, key];
}

export function forgetOpen(keys: string[], key: string): string[] {
  return keys.filter((item) => item !== key);
}

export function pruneOpen(keys: string[], known: string[]): string[] {
  return keys.filter((key) => known.includes(key));
}

export function cellKeyForPath(cells: Array<{ key: string; to: string }>, pathname: string): string | null {
  return cells.find((cell) => cellActive(pathname, cell.to))?.key ?? null;
}

export function isHostPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/settings" || pathname === "/account" || pathname.startsWith("/admin/");
}
