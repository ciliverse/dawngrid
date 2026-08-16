import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { useSession } from "../session";
import { cellActive } from "./cells";
import { type ChromeStyle, type IslandEdge } from "./dock";
import { HostMenu } from "./HostMenu";
import type { HostItem } from "./jump";
import { Mark } from "./Mark";
import { useOpenPages } from "./open-pages-context";
import { ThemeToggle } from "./ThemeToggle";

function useAxisOverflow(axis: "x" | "y", watch: number) {
  const ref = useRef<HTMLElement>(null);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setOver(axis === "x" ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1);
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, [axis, watch]);
  return { ref, over };
}

export function Island({
  hostItems,
  edge,
  style,
  onFind,
}: {
  hostItems: HostItem[];
  edge: IslandEdge;
  style: ChromeStyle;
  onFind: () => void;
}) {
  const { visibleCells: cells, closeCell } = useOpenPages();
  const { me, logout } = useSession();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const vertical = edge === "left" || edge === "right";
  const rail = style === "rail";
  const bar = style === "bar";
  const tabs = useAxisOverflow(vertical ? "y" : "x", cells.length);

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
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

  const here =
    loc.pathname === "/"
      ? "Grid"
      : cells.find((cell) => cellActive(loc.pathname, cell.to))?.label ??
        hostItems.find((item) => loc.pathname === item.to || loc.pathname.startsWith(`${item.to}/`))?.label ??
        "Host";

  const scopeLine = `${me?.scope.orgName ?? "no org"} / ${me?.scope.projectName ?? "no project"}${
    me?.scope.role ? ` / ${me.scope.role}` : ""
  }`;

  return (
    <div
      className={cn(
        "pointer-events-none relative z-30 flex shrink-0",
        bar && !vertical && "w-full",
        bar && vertical && "h-full",
        !bar && !vertical && "w-full justify-center px-3 py-1.5",
        !bar && vertical && "h-full items-center px-1.5 py-3",
      )}
    >
      <div
        className={cn(
          "island pointer-events-auto relative flex",
          bar && !vertical && "h-12 w-full items-center gap-2 rounded-none px-3",
          bar && vertical && "h-full w-52 flex-col items-stretch gap-2 rounded-none px-2 py-3",
          !bar && rail && vertical && "h-fit max-h-[min(88dvh,760px)] w-14 flex-col items-center gap-1.5 rounded-[22px] px-1 py-2",
          !bar && rail && !vertical && "w-fit max-w-[min(980px,100%)] items-center gap-1 rounded-full px-1.5 py-1",
          !bar && !rail && vertical && "h-fit max-h-[min(88dvh,760px)] w-[88px] flex-col items-center gap-2 rounded-[28px] px-1.5 py-2",
          !bar && !rail && !vertical && "w-fit max-w-[min(980px,100%)] items-center gap-1.5 rounded-full px-2 py-1.5",
        )}
      >
        <NavLink
          to="/"
          title="Back to the grid"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-muted"
        >
          <Mark />
          <span className="sr-only">Dawngrid grid</span>
        </NavLink>
        {vertical || rail ? null : <p className="hidden min-w-0 truncate px-1 text-sm font-medium sm:block">{here}</p>}
        <nav
          ref={tabs.ref}
          className={cn(
            "flex min-w-0",
            vertical && bar && "w-full min-h-0 flex-1 flex-col items-stretch gap-1",
            vertical && !bar && "w-full min-h-0 flex-col items-stretch gap-1",
            !vertical && bar && "min-w-0 flex-1 items-center gap-0.5 overflow-y-hidden",
            !vertical && !bar && "w-max min-w-0 max-w-full items-center gap-0.5 overflow-y-hidden",
            vertical && (bar || tabs.over) && "overflow-y-auto",
            !vertical && (bar || tabs.over) && "overflow-x-auto",
            vertical && !bar && !tabs.over && "overflow-y-clip",
            !vertical && !bar && !tabs.over && "overflow-x-clip",
          )}
        >
          {cells.map((cell) => {
            const on = cellActive(loc.pathname, cell.to);
            const Icon = cell.icon;
            return (
              <div
                key={cell.key}
                className={cn(
                  "relative flex shrink-0 items-center",
                  rail && "p-0.5",
                  vertical && !bar && !rail && "flex-col",
                )}
              >
                <NavLink
                  to={cell.to}
                  title={cell.label}
                  className={cn(
                    "flex shrink-0 items-center text-xs font-medium transition-colors duration-200",
                    rail ? "rounded-md" : "rounded-full",
                    rail && vertical && "justify-center px-0 py-2",
                    rail && !vertical && "size-8 justify-center",
                    !rail && vertical && "flex-col gap-0.5 px-1 py-1.5 text-center",
                    !rail && !vertical && "h-8 gap-1.5 px-2.5",
                    bar && vertical && "flex-row justify-start gap-2 rounded-md px-2 py-2",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  {rail ? (
                    <span className="sr-only">{cell.label}</span>
                  ) : (
                    <span className={cn("truncate", vertical && !bar ? "max-w-[4.6rem] text-[10px] leading-tight" : "max-w-[8rem]")}>
                      {cell.label}
                    </span>
                  )}
                </NavLink>
                <button
                  type="button"
                  aria-label={`Close ${cell.label}`}
                  title={`Close ${cell.label}`}
                  onClick={() => closeCell(cell.key)}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
                    rail && "absolute right-0 top-0 size-4 bg-background/90",
                    !rail && !vertical && "ml-0.5",
                    !rail && vertical && "mt-0.5",
                  )}
                >
                  <X className="size-2.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </nav>
        {vertical || rail ? null : (
          <p className="hidden max-w-[120px] truncate font-mono text-[11px] text-muted-foreground md:block">
            {me?.scope.projectName ?? "no project"}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Find a cell or page"
          title="Find a cell or page"
          onClick={onFind}
          className="rounded-full"
        >
          <Search className="size-3.5" strokeWidth={1.75} />
        </Button>
        <ThemeToggle
          placement={edge}
          className="size-8 rounded-full border-transparent bg-transparent hover:bg-muted"
        />
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="You and the host"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full"
            title="You and the host"
          >
            <span className="text-xs font-medium">{(me?.user.username ?? "?").slice(0, 1).toUpperCase()}</span>
          </Button>
          {open ? (
            <HostMenu
              hostItems={hostItems}
              displayName={me?.user.displayName ?? me?.user.username ?? "You"}
              scopeLine={scopeLine}
              onLogout={logout}
              placement={edge}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
