import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { type IslandEdge } from "./dock";
import { PALETTES, type PaletteId, useTheme } from "../theme";

const SWATCH: Record<PaletteId, string> = {
  dawn: "bg-[oklch(0.5_0.14_48)]",
  ion: "bg-[oklch(0.62_0.16_230)]",
  tide: "bg-[oklch(0.46_0.09_196)]",
};

export function ThemeToggle({
  className,
  placement = "top",
}: {
  className?: string;
  placement?: IslandEdge;
}) {
  const { mode, palette, setMode, setPalette } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Theme"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Theme"
        onClick={() => setOpen((value) => !value)}
        className={cn("rounded-full", className)}
      >
        {mode === "dark" ? <Sun className="size-3.5" strokeWidth={1.75} /> : <Moon className="size-3.5" strokeWidth={1.75} />}
      </Button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-40 w-52 rounded-lg border border-border bg-popover p-2 text-popover-foreground",
            placement === "top" && "top-[calc(100%+10px)] right-0",
            placement === "bottom" && "bottom-[calc(100%+10px)] right-0",
            placement === "left" && "bottom-0 left-[calc(100%+10px)]",
            placement === "right" && "right-[calc(100%+10px)] bottom-0",
          )}
        >
          <p className="px-1.5 pb-1.5 font-mono text-[11px] text-muted-foreground">Palette</p>
          <div className="flex flex-col gap-0.5">
            {PALETTES.map((item) => {
              const on = palette === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    on ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  onClick={() => setPalette(item.id)}
                >
                  <span className={cn("size-3.5 rounded-full", SWATCH[item.id])} />
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    <span className={cn("block text-[11px]", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-border pt-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "light" ? "default" : "ghost"}
              onClick={() => setMode("light")}
            >
              Light
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "dark" ? "default" : "ghost"}
              onClick={() => setMode("dark")}
            >
              Dark
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
