import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { CellPreview } from "./CellPreview";
import type { FloorCell } from "./FloorView";
import { Flip, prefersReducedMotion } from "./gsap";
import { useOpenOnEnter } from "./use-open-on-enter";

export function LeapFloor({
  floor,
  focused,
  onFocus,
  onAdd,
  onRemove,
  removePending,
}: {
  floor: FloorCell[];
  focused: FloorCell | null;
  onFocus: (key: string) => void;
  onAdd: () => void;
  onRemove: (id: string, name: string) => void;
  removePending: boolean;
}) {
  const nav = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<ReturnType<typeof Flip.getState> | null>(null);
  useOpenOnEnter(focused?.to ?? null);

  useLayoutEffect(() => {
    const state = pending.current;
    pending.current = null;
    if (!state || !root.current || prefersReducedMotion()) return;
    const tween = Flip.from(state, {
      duration: 0.62,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      scale: true,
    });
    return () => {
      tween.kill();
      Flip.killFlipsOf(root.current?.querySelectorAll("[data-flip-id]") ?? []);
    };
  }, [focused?.key]);

  function pick(cell: FloorCell) {
    if (focused?.key === cell.key) {
      nav(cell.to);
      return;
    }
    if (root.current && !prefersReducedMotion()) {
      pending.current = Flip.getState(root.current.querySelectorAll("[data-flip-id]"));
    }
    onFocus(cell.key);
  }

  return (
    <div ref={root} className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <nav className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto" aria-label="Cells on this floor">
        {floor.map((cell) => {
          const on = focused?.key === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => pick(cell)}
              className={cn(
                "flex flex-col gap-1.5 rounded-md px-2 py-2 text-left",
                on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="truncate px-1 text-sm font-medium">{cell.name}</span>
              {on ? (
                <span className="leap-slot block h-14 rounded-sm bg-background/20" />
              ) : (
                <span data-flip-id={cell.key} className="leap-tile relative block h-14 overflow-hidden rounded-sm">
                  <CellPreview name={cell.name} href={cell.href} live={false} />
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground hover:border-primary/55 hover:text-primary"
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
          Add a URL
        </button>
      </nav>
      <div className="min-h-0 min-w-0 flex-1">
        {focused ? (
          <div
            data-flip-id={focused.key}
            className="bay-stage relative flex h-full min-h-0 flex-col overflow-hidden"
          >
            <span className="bay-frame pointer-events-none absolute inset-0" />
            <button
              type="button"
              className="relative flex min-h-0 flex-1 flex-col text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => nav(focused.to)}
            >
              <CellPreview name={focused.name} href={focused.href} featured live />
              <span className="sr-only">Open {focused.name}</span>
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-background/90 via-background/45 to-transparent px-4 pt-16 pb-3">
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold tracking-tight">{focused.name}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {focused.kind}
                  <span className="mx-1.5 text-border">/</span>
                  {focused.detail}
                </p>
              </div>
              {focused.removable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="pointer-events-auto text-muted-foreground hover:text-destructive"
                  disabled={removePending}
                  onClick={() => onRemove(focused.id, focused.name)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="bay-stage relative flex h-full min-h-0 flex-col items-start justify-end gap-2 p-6 text-left"
            onClick={onAdd}
          >
            <span className="bay-frame pointer-events-none absolute inset-0" />
            <p className="text-2xl font-semibold tracking-tight">This host is dark</p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">Paste a running UI and the first bay lights here.</p>
          </button>
        )}
      </div>
    </div>
  );
}
