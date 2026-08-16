import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "../lib/utils";
import type { CellLink } from "./cells";
import {
  collectJumpTargets,
  isJumpHotkey,
  rankJumpTargets,
  shouldIgnoreJumpHotkey,
  type HostItem,
  type JumpTarget,
} from "./jump";

export function JumpOverlay({
  open,
  onOpenChange,
  cells,
  hostItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cells: CellLink[];
  hostItems: HostItem[];
}) {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const targets = useMemo(() => collectJumpTargets(cells, hostItems), [cells, hostItems]);
  const hits = useMemo(() => rankJumpTargets(targets, query), [targets, query]);
  const cellsHits = hits.filter((row) => row.kind === "cell");
  const hostHits = hits.filter((row) => row.kind === "host");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    setActive(0);
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isJumpHotkey(event)) {
        if (open) {
          event.preventDefault();
          onOpenChange(false);
          return;
        }
        if (shouldIgnoreJumpHotkey(event.target as HTMLElement | null)) return;
        event.preventDefault();
        onOpenChange(true);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (hits.length === 0 ? 0 : (i + 1) % hits.length));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (hits.length === 0 ? 0 : (i - 1 + hits.length) % hits.length));
        return;
      }
      if (event.key === "Enter") {
        const hit = hits[active];
        if (!hit) return;
        event.preventDefault();
        go(hit);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hits, active, onOpenChange]);

  function go(hit: JumpTarget) {
    onOpenChange(false);
    nav(hit.to);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh] sm:pt-[18vh]">
      <button
        type="button"
        aria-label="Close find"
        className="absolute inset-0 bg-background/70"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find a cell or page"
        data-jump-overlay
        className="bay-stage relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
      >
        <span className="bay-frame pointer-events-none absolute inset-0" />
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a cell or page"
            aria-controls="jump-list"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id="jump-list" role="listbox" className="max-h-[min(52vh,22rem)] overflow-auto p-1.5">
          {hits.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches</li>
          ) : (
            <>
              <JumpGroup
                title="Cells"
                rows={cellsHits}
                hits={hits}
                active={active}
                onHover={setActive}
                onPick={go}
              />
              <JumpGroup
                title="Host"
                rows={hostHits}
                hits={hits}
                active={active}
                onHover={setActive}
                onPick={go}
              />
            </>
          )}
        </ul>
        <p className="border-t border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
          up down move · enter go · esc close
        </p>
      </div>
    </div>
  );
}

function JumpGroup({
  title,
  rows,
  hits,
  active,
  onHover,
  onPick,
}: {
  title: string;
  rows: JumpTarget[];
  hits: JumpTarget[];
  active: number;
  onHover: (index: number) => void;
  onPick: (hit: JumpTarget) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <li className="list-none">
      <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => {
          const index = hits.indexOf(row);
          const on = index === active;
          return (
            <li key={row.key}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(row)}
                className={cn(
                  "flex w-full items-baseline justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                  on ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span className="truncate font-medium">{row.label}</span>
                <span className={cn("truncate font-mono text-[11px]", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {row.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
