import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import { type IslandEdge } from "./dock";
import type { HostItem } from "./jump";

export function HostMenu({
  hostItems,
  displayName,
  scopeLine,
  onLogout,
  placement,
}: {
  hostItems: HostItem[];
  displayName: string;
  scopeLine: string;
  onLogout: () => void;
  placement: IslandEdge;
}) {
  return (
    <div
      role="menu"
      className={cn(
        "absolute z-40 w-56 rounded-lg border border-border bg-popover p-2 text-popover-foreground",
        placement === "top" && "top-[calc(100%+10px)] right-0",
        placement === "bottom" && "bottom-[calc(100%+10px)] right-0",
        placement === "left" && "bottom-0 left-[calc(100%+10px)]",
        placement === "right" && "right-[calc(100%+10px)] bottom-0",
      )}
    >
      <div className="mb-2 border-b border-border px-2.5 pb-2">
        <p className="text-sm font-semibold">{displayName}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{scopeLine}</p>
      </div>
      <div className="flex flex-col gap-0.5">
        <NavLink
          to="/"
          role="menuitem"
          className="rounded-md px-2.5 py-2 text-sm hover:bg-muted hover:text-foreground"
        >
          Grid
        </NavLink>
        {hostItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            role="menuitem"
            className="rounded-md px-2.5 py-2 text-sm hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          role="menuitem"
          className="rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted hover:text-foreground"
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
