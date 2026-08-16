export const WHEEL_GAP_MS = 280;

export function stepFocus(keys: string[], current: string | null, delta: -1 | 1): string | null {
  if (keys.length === 0) return null;
  const index = current ? keys.indexOf(current) : -1;
  if (index < 0) return keys[0] ?? null;
  return keys[Math.max(0, Math.min(keys.length - 1, index + delta))] ?? null;
}

export function shouldIgnoreFloorWheel(target: { tagName: string; isContentEditable: boolean } | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function shouldAcceptWheel(now: number, lastAt: number, gap: number): boolean {
  return now - lastAt >= gap;
}
