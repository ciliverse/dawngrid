import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { CellPreview } from "./CellPreview";
import { DeckFloor } from "./DeckFloor";
import type { FloorStyle } from "./dock";
import { LeapFloor } from "./LeapFloor";
import { useFloorWheel } from "./use-floor-wheel";
import { useOpenOnEnter } from "./use-open-on-enter";

export type FloorCell = {
  key: string;
  id: string;
  name: string;
  to: string;
  kind: string;
  detail: string;
  meta: string;
  href?: string;
  home: boolean;
  removable: boolean;
};

const PADS = [
  { left: 4, top: 4, width: 46, height: 58 },
  { left: 54, top: 8, width: 40, height: 34 },
  { left: 54, top: 46, width: 24, height: 28 },
  { left: 80, top: 46, width: 16, height: 22 },
  { left: 8, top: 66, width: 26, height: 28 },
  { left: 36, top: 70, width: 16, height: 24 },
];

const MOSAIC = [
  "col-span-6 row-span-4",
  "col-span-3 row-span-2",
  "col-span-3 row-span-2",
  "col-span-3 row-span-2",
  "col-span-3 row-span-2",
  "col-span-3 row-span-2",
];

export function FloorView({
  style,
  floor,
  focused,
  onFocus,
  onAdd,
  onRemove,
  removePending,
  wheelEnabled = true,
}: {
  style: FloorStyle;
  floor: FloorCell[];
  focused: FloorCell | null;
  onFocus: (key: string) => void;
  onAdd: () => void;
  onRemove: (id: string, name: string) => void;
  removePending: boolean;
  wheelEnabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useFloorWheel({
    keys: floor.map((cell) => cell.key),
    focused: focused?.key ?? null,
    onFocus,
    enabled: wheelEnabled,
    root,
  });
  useOpenOnEnter(focused?.to ?? null);

  const inner = <FloorInner style={style} floor={floor} focused={focused} onFocus={onFocus} onAdd={onAdd} onRemove={onRemove} removePending={removePending} />;
  return (
    <div ref={root} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {inner}
    </div>
  );
}

function FloorInner({
  style,
  floor,
  focused,
  onFocus,
  onAdd,
  onRemove,
  removePending,
}: {
  style: FloorStyle;
  floor: FloorCell[];
  focused: FloorCell | null;
  onFocus: (key: string) => void;
  onAdd: () => void;
  onRemove: (id: string, name: string) => void;
  removePending: boolean;
}) {
  if (style === "rack") {
    return (
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <Stage
          cell={focused}
          onAdd={onAdd}
          onRemove={onRemove}
          removePending={removePending}
          className="flex-1"
        />
        <BayList
          floor={floor}
          focused={focused}
          onFocus={onFocus}
          onAdd={onAdd}
          vertical
        />
      </div>
    );
  }

  if (style === "constellation") {
    return (
      <Constellation
        floor={floor}
        focused={focused}
        onFocus={onFocus}
        onAdd={onAdd}
        onRemove={onRemove}
        removePending={removePending}
      />
    );
  }

  if (style === "leap") {
    return (
      <LeapFloor
        floor={floor}
        focused={focused}
        onFocus={onFocus}
        onAdd={onAdd}
        onRemove={onRemove}
        removePending={removePending}
      />
    );
  }

  if (style === "deck") {
    return (
      <DeckFloor
        floor={floor}
        focused={focused}
        onFocus={onFocus}
        onAdd={onAdd}
        onRemove={onRemove}
        removePending={removePending}
      />
    );
  }

  if (style === "approach") {
    return (
      <Approach
        floor={floor}
        focused={focused}
        onFocus={onFocus}
        onAdd={onAdd}
        onRemove={onRemove}
        removePending={removePending}
      />
    );
  }

  if (style === "mosaic") {
    return (
      <ul className="grid min-h-0 flex-1 grid-cols-6 grid-rows-4 gap-2 overflow-hidden md:grid-cols-12">
        {floor.map((cell, index) => (
          <li key={cell.key} className={cn("floor-cell min-h-0", MOSAIC[index] ?? "col-span-3 row-span-2")}>
            <Pad
              cell={cell}
              focused={focused?.key === cell.key}
              onFocus={onFocus}
              onRemove={onRemove}
              removePending={removePending}
            />
          </li>
        ))}
        <li className={cn("floor-cell min-h-0", MOSAIC[floor.length] ?? "col-span-3 row-span-2")}>
          <AddPad onAdd={onAdd} />
        </li>
      </ul>
    );
  }

  return (
    <>
      <Stage cell={focused} onAdd={onAdd} onRemove={onRemove} removePending={removePending} className="flex-1" />
      <BayList floor={floor} focused={focused} onFocus={onFocus} onAdd={onAdd} />
    </>
  );
}

function Approach({
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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || !focused) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      }
      nav(focused.to);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focused, nav]);

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <nav className="flex w-44 shrink-0 flex-col gap-1 overflow-y-auto" aria-label="Cells on this floor">
        {floor.map((cell) => {
          const on = focused?.key === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => {
                if (on) nav(cell.to);
                else onFocus(cell.key);
              }}
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
      <div className="approach-stage min-h-0 min-w-0 flex-1">
        {focused ? (
          <div key={focused.key} className="approach-card bay-stage relative flex h-full min-h-0 flex-col overflow-hidden">
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

function Stage({
  cell,
  onAdd,
  onRemove,
  removePending,
  className,
}: {
  cell: FloorCell | null;
  onAdd: () => void;
  onRemove: (id: string, name: string) => void;
  removePending: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bay-stage floor-cell flex min-h-0 flex-col overflow-hidden", className)}>
      <span className="bay-frame pointer-events-none absolute inset-0" />
      {cell ? (
        <>
          <Link
            to={cell.to}
            className="relative flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CellPreview name={cell.name} href={cell.href} featured live />
            <span className="sr-only">Open {cell.name}</span>
          </Link>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-background/90 via-background/45 to-transparent px-4 pt-16 pb-3">
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold tracking-tight">{cell.name}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {cell.kind}
                <span className="mx-1.5 text-border">/</span>
                {cell.detail}
                <span className="mx-1.5 text-border">/</span>
                {cell.meta}
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
        </>
      ) : (
        <button
          type="button"
          className="flex h-full min-h-0 flex-col items-start justify-end gap-2 p-6 text-left"
          onClick={onAdd}
        >
          <p className="text-2xl font-semibold tracking-tight">This host is dark</p>
          <p className="max-w-[36ch] text-sm text-muted-foreground">Paste a running UI and the first bay lights here.</p>
        </button>
      )}
    </div>
  );
}

function BayList({
  floor,
  focused,
  onFocus,
  onAdd,
  vertical = false,
}: {
  floor: FloorCell[];
  focused: FloorCell | null;
  onFocus: (key: string) => void;
  onAdd: () => void;
  vertical?: boolean;
}) {
  const nav = useNavigate();
  return (
    <div className={cn("shrink-0", vertical && "flex w-52 flex-col")}>
      {vertical ? null : (
        <div className="mb-1.5 flex items-baseline justify-between font-mono text-[11px] text-muted-foreground">
          <span>Bays</span>
          <span>{floor.length} on this host</span>
        </div>
      )}
      <ul className={cn(vertical ? "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" : "flex gap-2 overflow-x-auto pb-0.5")}>
        {floor.map((cell, index) => {
          const on = focused?.key === cell.key;
          return (
            <li key={cell.key} className="floor-cell shrink-0" style={{ animationDelay: `${0.08 + index * 0.05}s` }}>
              <button
                type="button"
                className={cn(
                  "flex overflow-hidden rounded-md border text-left transition-colors duration-150",
                  vertical ? "w-full flex-row items-center gap-2 p-1.5" : "w-[8.5rem] flex-col",
                  on ? "border-primary bg-primary/10" : "border-border bg-background/70 hover:border-foreground/30",
                )}
                onClick={() => {
                  if (on) nav(cell.to);
                  else onFocus(cell.key);
                }}
              >
                <div className={cn("overflow-hidden", vertical ? "size-10 shrink-0" : "h-12")}>
                  <CellPreview name={cell.name} href={cell.href} live={false} />
                </div>
                <span className="truncate px-2 py-1.5 text-xs font-medium">{cell.name}</span>
              </button>
            </li>
          );
        })}
        <li className="floor-cell shrink-0" style={{ animationDelay: `${0.08 + floor.length * 0.05}s` }}>
          <button
            type="button"
            className={cn(
              "flex items-start justify-between rounded-md border border-dashed border-border bg-background/50 text-left hover:border-primary/55 hover:text-primary",
              vertical ? "w-full flex-row items-center gap-2 px-2 py-2" : "h-full min-h-[4.25rem] w-[8.5rem] flex-col px-2 py-1.5",
            )}
            onClick={onAdd}
          >
            <Plus className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-xs font-medium">Add a URL</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

function Constellation({
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
  const pads = PADS.slice(0, Math.min(floor.length + 1, PADS.length));
  const traces = pads.slice(1).map((pad, index) => {
    const from = pads[index];
    return {
      x1: from.left + from.width / 2,
      y1: from.top + from.height / 2,
      x2: pad.left + pad.width / 2,
      y2: pad.top + pad.height / 2,
    };
  });

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {traces.map((line) => (
          <line
            key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--primary)"
            strokeWidth="0.35"
            strokeOpacity="0.45"
          />
        ))}
      </svg>
      {floor.map((cell, index) => {
        const pad = pads[index];
        if (!pad) return null;
        return (
          <div
            key={cell.key}
            className="floor-cell absolute min-h-0"
            style={{ left: `${pad.left}%`, top: `${pad.top}%`, width: `${pad.width}%`, height: `${pad.height}%` }}
          >
            <Pad
              cell={cell}
              focused={focused?.key === cell.key}
              onFocus={onFocus}
              onRemove={onRemove}
              removePending={removePending}
            />
          </div>
        );
      })}
      {pads[floor.length] ? (
        <div
          className="floor-cell absolute min-h-0"
          style={{
            left: `${pads[floor.length].left}%`,
            top: `${pads[floor.length].top}%`,
            width: `${pads[floor.length].width}%`,
            height: `${pads[floor.length].height}%`,
          }}
        >
          <AddPad onAdd={onAdd} />
        </div>
      ) : null}
    </div>
  );
}

function Pad({
  cell,
  focused,
  onFocus,
  onRemove,
  removePending,
}: {
  cell: FloorCell;
  focused: boolean;
  onFocus: (key: string) => void;
  onRemove: (id: string, name: string) => void;
  removePending: boolean;
}) {
  const nav = useNavigate();
  return (
    <div
      className={cn(
        "group relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-background/70",
        focused ? "border-primary" : "border-border hover:border-primary/55",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => {
          if (focused) nav(cell.to);
          else onFocus(cell.key);
        }}
      >
        <span className="sr-only">{focused ? `Open ${cell.name}` : `Show ${cell.name}`}</span>
      </button>
      <CellPreview name={cell.name} href={cell.href} featured={focused} live={focused} />
      <div className="relative flex shrink-0 items-center justify-between gap-2 px-2.5 py-1.5">
        <span className={cn("truncate font-semibold tracking-tight", focused ? "text-sm" : "text-xs")}>{cell.name}</span>
        {cell.removable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="relative z-20 h-6 text-muted-foreground hover:text-destructive"
            disabled={removePending}
            onClick={() => onRemove(cell.id, cell.name)}
          >
            Remove
          </Button>
        ) : (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{cell.kind}</span>
        )}
      </div>
    </div>
  );
}

function AddPad({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      className="flex h-full min-h-0 w-full flex-col items-start justify-between rounded-lg border border-dashed border-border bg-background/50 p-3 text-left hover:border-primary/55 hover:text-primary"
      onClick={onAdd}
    >
      <Plus className="size-4 text-muted-foreground" strokeWidth={1.75} />
      <span className="text-sm font-medium">Add a URL</span>
    </button>
  );
}
