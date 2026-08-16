export type JumpCell = {
  key: string;
  to: string;
  label: string;
  kind: string;
  href?: string;
};

export type HostItem = {
  to: string;
  label: string;
};

export type JumpKind = "cell" | "host";

export type JumpTarget = {
  key: string;
  to: string;
  label: string;
  kind: JumpKind;
  hint: string;
};

export type JumpHotkeyTarget = {
  tagName?: string;
  isContentEditable?: boolean;
} | null;

export function collectJumpTargets(cells: JumpCell[], hostItems: HostItem[]): JumpTarget[] {
  return [
    ...cells.map((cell) => ({
      key: cell.key,
      to: cell.to,
      label: cell.label,
      kind: "cell" as const,
      hint: cell.href ?? cell.kind,
    })),
    { key: "host:grid", to: "/", label: "Grid", kind: "host", hint: "home" },
    ...hostItems.map((item) => ({
      key: `host:${item.to}`,
      to: item.to,
      label: item.label,
      kind: "host" as const,
      hint: item.to,
    })),
  ];
}

export function rankJumpTargets(targets: JumpTarget[], query: string): JumpTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return targets;

  return targets
    .map((target) => ({ target, score: scoreTarget(target, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || kindRank(a.target.kind) - kindRank(b.target.kind))
    .map((row) => row.target);
}

export function shouldIgnoreJumpHotkey(target: JumpHotkeyTarget): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function isJumpHotkey(event: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}

function scoreTarget(target: JumpTarget, q: string): number {
  const label = target.label.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  if (target.hint.toLowerCase().includes(q) || target.to.toLowerCase().includes(q)) return 40;
  return 0;
}

function kindRank(kind: JumpKind): number {
  return kind === "cell" ? 0 : 1;
}
