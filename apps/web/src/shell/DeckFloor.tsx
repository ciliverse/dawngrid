import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { CellPreview } from "./CellPreview";
import type { FloorCell } from "./FloorView";
import { gsap, prefersReducedMotion, useGSAP } from "./gsap";
import { useOpenOnEnter } from "./use-open-on-enter";

export function DeckFloor({
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
  const stage = useRef<HTMLDivElement>(null);
  const focusIndex = Math.max(0, floor.findIndex((cell) => cell.key === focused?.key));
  useOpenOnEnter(focused?.to ?? null);

  useGSAP(
    () => {
      const cards = stage.current?.querySelectorAll<HTMLElement>("[data-deck-card]");
      if (!cards?.length) return;
      const instant = prefersReducedMotion();
      cards.forEach((card, index) => {
        const offset = index - focusIndex;
        const fan = Math.max(-2, Math.min(2, offset));
        gsap.to(card, {
          x: fan * 56,
          z: -Math.min(Math.abs(offset), 4) * 90,
          rotationY: fan * -28,
          scale: offset === 0 ? 1 : 0.78,
          autoAlpha: offset === 0 ? 1 : Math.max(0.55, 0.7 - Math.abs(offset) * 0.04),
          duration: instant ? 0 : 0.55,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    },
    { dependencies: [focusIndex, floor.length], scope: stage },
  );

  function pick(cell: FloorCell) {
    if (focused?.key === cell.key) nav(cell.to);
    else onFocus(cell.key);
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <nav className="flex w-44 shrink-0 flex-col gap-1 overflow-y-auto" aria-label="Cells on this floor">
        {floor.map((cell) => {
          const on = focused?.key === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => pick(cell)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm font-medium",
                on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cell.name}
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
      <div className="relative min-h-0 min-w-0 flex-1">
        {floor.length === 0 ? (
          <button
            type="button"
            className="bay-stage relative flex h-full min-h-0 flex-col items-start justify-end gap-2 p-6 text-left"
            onClick={onAdd}
          >
            <span className="bay-frame pointer-events-none absolute inset-0" />
            <p className="text-2xl font-semibold tracking-tight">This host is dark</p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">Paste a running UI and the first bay lights here.</p>
          </button>
        ) : (
          <div ref={stage} className="deck-stage relative h-full min-h-0">
            {floor.map((cell, index) => {
              const on = focused?.key === cell.key;
              return (
                <div
                  key={cell.key}
                  data-deck-card
                  className="deck-card bay-stage absolute inset-[8%] overflow-hidden"
                  style={{ zIndex: 40 - Math.abs(index - focusIndex) }}
                >
                  <span className="bay-frame pointer-events-none absolute inset-0" />
                  <button
                    type="button"
                    className="relative flex h-full min-h-0 w-full flex-col text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() => pick(cell)}
                  >
                    <CellPreview name={cell.name} href={cell.href} featured={on} live={on} />
                    <span className="sr-only">{on ? `Open ${cell.name}` : `Show ${cell.name}`}</span>
                  </button>
                  {on ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-background/90 via-background/45 to-transparent px-4 pt-16 pb-3">
                      <div className="min-w-0">
                        <p className="truncate text-2xl font-semibold tracking-tight">{cell.name}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {cell.kind}
                          <span className="mx-1.5 text-border">/</span>
                          {cell.detail}
                        </p>
                      </div>
                      {cell.removable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="pointer-events-auto text-muted-foreground hover:text-destructive"
                          disabled={removePending}
                          onClick={() => onRemove(cell.id, cell.name)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
