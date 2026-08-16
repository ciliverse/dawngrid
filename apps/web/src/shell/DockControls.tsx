import { cn } from "../lib/utils";
import { PALETTES, type PaletteId, type ThemeMode, useTheme } from "../theme";
import { CHROME_STYLES, FLOOR_STYLES, type ChromeStyle, type FloorStyle, type IslandEdge } from "./dock";

const SWATCH: Record<PaletteId, string> = {
  dawn: "bg-[oklch(0.5_0.14_48)]",
  ion: "bg-[oklch(0.62_0.16_230)]",
  tide: "bg-[oklch(0.46_0.09_196)]",
};

const EDGES: Array<{ id: IslandEdge; label: string }> = [
  { id: "top", label: "Top" },
  { id: "right", label: "Right" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
];

export function PlaceControl({
  edge,
  onEdge,
}: {
  edge: IslandEdge;
  onEdge: (edge: IslandEdge) => void;
}) {
  return (
    <div className="grid max-w-sm grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] gap-2">
      <span />
      <EdgeButton edge="top" current={edge} onEdge={onEdge} />
      <span />
      <EdgeButton edge="left" current={edge} onEdge={onEdge} />
      <div className="grid min-h-[9rem] place-items-center rounded-lg border border-dashed border-border bg-muted/40 font-mono text-xs text-muted-foreground">
        Screen
      </div>
      <EdgeButton edge="right" current={edge} onEdge={onEdge} />
      <span />
      <EdgeButton edge="bottom" current={edge} onEdge={onEdge} />
      <span />
    </div>
  );
}

export function StyleControl({
  style,
  onStyle,
}: {
  style: ChromeStyle;
  onStyle: (style: ChromeStyle) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {CHROME_STYLES.map((item) => {
        const on = style === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors duration-150",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/70 hover:border-foreground/30 hover:bg-accent",
            )}
            onClick={() => onStyle(item.id)}
          >
            <StyleSketch kind={item.id} active={on} />
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className={cn("mt-0.5 block text-xs", on ? "text-primary-foreground/85" : "text-muted-foreground")}>
                {item.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeControl() {
  const { mode, palette, setMode, setPalette } = useTheme();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {PALETTES.map((item) => {
          const on = palette === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors duration-150",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/70 hover:border-foreground/30 hover:bg-accent",
              )}
              onClick={() => setPalette(item.id)}
            >
              <span className={cn("h-10 rounded-md", SWATCH[item.id])} />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={cn("mt-0.5 block text-xs", on ? "text-primary-foreground/85" : "text-muted-foreground")}>
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        {(["light", "dark"] as ThemeMode[]).map((item) => {
          const on = mode === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={on}
              className={cn(
                "h-9 rounded-md border px-3 text-sm font-medium capitalize",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/70 hover:border-foreground/30 hover:bg-accent",
              )}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FloorControl({
  floor,
  onFloor,
}: {
  floor: FloorStyle;
  onFloor: (floor: FloorStyle) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {FLOOR_STYLES.map((item) => {
        const on = floor === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors duration-150",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/70 hover:border-foreground/30 hover:bg-accent",
            )}
            onClick={() => onFloor(item.id)}
          >
            <FloorSketch kind={item.id} active={on} />
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className={cn("mt-0.5 block text-xs", on ? "text-primary-foreground/85" : "text-muted-foreground")}>
                {item.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FloorSketch({ kind, active }: { kind: FloorStyle; active: boolean }) {
  const ink = active ? "bg-primary-foreground/90" : "bg-foreground/65";
  const mid = active ? "bg-primary-foreground/55" : "bg-foreground/35";
  const frame = active ? "border-primary-foreground/35" : "border-border";
  return (
    <div className={cn("relative h-16 overflow-hidden rounded-md border", frame)}>
      {kind === "stage" ? (
        <>
          <span className={cn("absolute top-1.5 right-1.5 left-1.5 h-8", mid)} />
          <span className={cn("absolute bottom-1.5 left-1.5 h-2 w-4", ink)} />
          <span className={cn("absolute bottom-1.5 left-6 h-2 w-4", mid)} />
          <span className={cn("absolute right-6 bottom-1.5 h-2 w-4", mid)} />
        </>
      ) : null}
      {kind === "constellation" ? (
        <>
          <span className={cn("absolute top-2 left-2 size-6", ink)} />
          <span className={cn("absolute top-3 right-3 size-3", mid)} />
          <span className={cn("absolute bottom-2 left-8 size-4", mid)} />
          <span className={cn("absolute right-6 bottom-3 size-2.5", ink)} />
        </>
      ) : null}
      {kind === "rack" ? (
        <>
          <span className={cn("absolute top-1.5 bottom-1.5 left-1.5 w-8", mid)} />
          <span className={cn("absolute top-1.5 right-1.5 h-2 w-5", ink)} />
          <span className={cn("absolute top-5 right-1.5 h-2 w-5", mid)} />
          <span className={cn("absolute top-8 right-1.5 h-2 w-5", mid)} />
        </>
      ) : null}
      {kind === "mosaic" ? (
        <>
          <span className={cn("absolute top-1.5 bottom-1.5 left-1.5 w-7", ink)} />
          <span className={cn("absolute top-1.5 right-1.5 h-5 w-6", mid)} />
          <span className={cn("absolute right-1.5 bottom-1.5 h-3 w-4", mid)} />
        </>
      ) : null}
      {kind === "approach" ? (
        <>
          <span className={cn("absolute top-1.5 bottom-1.5 left-1.5 w-3", mid)} />
          <span className={cn("absolute top-2 right-2 bottom-2 left-6", ink)} />
        </>
      ) : null}
      {kind === "leap" ? (
        <>
          <span className={cn("absolute top-2 left-1.5 h-3 w-3", mid)} />
          <span className={cn("absolute top-3 right-2 bottom-2 left-6", ink)} />
        </>
      ) : null}
      {kind === "deck" ? (
        <>
          <span className={cn("absolute top-3 right-5 bottom-2 left-7", mid)} />
          <span className={cn("absolute top-2 right-3 bottom-1.5 left-5", ink)} />
        </>
      ) : null}
    </div>
  );
}

function EdgeButton({
  edge,
  current,
  onEdge,
}: {
  edge: IslandEdge;
  current: IslandEdge;
  onEdge: (edge: IslandEdge) => void;
}) {
  const on = current === edge;
  const label = EDGES.find((item) => item.id === edge)?.label ?? edge;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Place on ${label}`}
      title={label}
      className={cn(
        "rounded-md border text-xs font-medium transition-colors duration-150",
        edge === "top" || edge === "bottom" ? "h-9 px-3" : "w-14 px-1",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/70 text-foreground hover:border-foreground/30 hover:bg-accent",
      )}
      onClick={() => onEdge(edge)}
    >
      {label}
    </button>
  );
}

function StyleSketch({ kind, active }: { kind: ChromeStyle; active: boolean }) {
  const bar = active ? "bg-primary-foreground/90" : "bg-foreground/70";
  const frame = active ? "border-primary-foreground/35" : "border-border";
  return (
    <div className={cn("relative h-16 rounded-md border", frame)}>
      {kind === "island" ? (
        <span className={cn("absolute top-1.5 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full", bar)} />
      ) : null}
      {kind === "bar" ? <span className={cn("absolute inset-x-0 top-0 h-2", bar)} /> : null}
      {kind === "rail" ? (
        <span className="absolute top-1.5 left-1/2 flex -translate-x-1/2 gap-1">
          <i className={cn("size-1.5 rounded-full", bar)} />
          <i className={cn("size-1.5 rounded-full", bar)} />
          <i className={cn("size-1.5 rounded-full", bar)} />
        </span>
      ) : null}
    </div>
  );
}
