import { type ReactNode, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { PluginRegistration } from "@dawngrid/plugin-sdk";
import type { EmbedCell, PluginInfo } from "../api";
import { cn } from "../lib/utils";
import { useSession } from "../session";
import { cellLinks } from "./cells";
import { DockProvider, useDock } from "./dock-context";
import { Island } from "./Island";
import { JumpOverlay } from "./JumpOverlay";
import { OpenPagesProvider } from "./open-pages-context";
import { TechFloor } from "./TechFloor";

export function Shell({
  plugins,
  embeds = [],
  children,
  flush = false,
}: {
  plugins: Array<{ info: PluginInfo; registration: PluginRegistration }>;
  embeds?: EmbedCell[];
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <DockProvider>
      <ShellFrame plugins={plugins} embeds={embeds} flush={flush}>
        {children}
      </ShellFrame>
    </DockProvider>
  );
}

function ShellFrame({
  plugins,
  embeds,
  children,
  flush,
}: {
  plugins: Array<{ info: PluginInfo; registration: PluginRegistration }>;
  embeds: EmbedCell[];
  children: ReactNode;
  flush: boolean;
}) {
  const { me } = useSession();
  const loc = useLocation();
  const { edge, style } = useDock();
  const [findOpen, setFindOpen] = useState(false);
  const perms = me?.perms;
  const can = (perm: string) => Boolean(perms?.includes(perm));
  const cells = useMemo(
    () => cellLinks(plugins, embeds, (perm) => Boolean(perms?.includes(perm))),
    [plugins, embeds, perms],
  );
  const hostItems = [
    { to: "/settings", label: "Layout" },
    { to: "/admin/plugins", label: "Plugins" },
    { to: "/admin/cells", label: "Cells" },
    ...(can("host.users.read") || can("host.users.write") ? [{ to: "/admin/users", label: "People" }] : []),
    ...(can("host.roles.read") ? [{ to: "/admin/roles", label: "Roles" }] : []),
    ...(can("host.audit.read") ? [{ to: "/admin/audit", label: "Audit" }] : []),
    ...(can("host.orgs.read") || can("host.orgs.write") ? [{ to: "/admin/orgs", label: "Places" }] : []),
    { to: "/account", label: "You" },
  ];

  const chrome = (
    <Island hostItems={hostItems} edge={edge} style={style} onFind={() => setFindOpen(true)} />
  );

  const main = (
    <div
      className={cn(
        "relative z-10 flex h-full min-h-0 min-w-0 flex-col",
        flush ? "overflow-hidden" : "px-5 py-3 md:px-7",
        flush || loc.pathname === "/" ? "overflow-hidden" : "overflow-auto",
      )}
    >
      {children}
    </div>
  );

  return (
    <OpenPagesProvider cells={cells}>
      <div className="dawn-wash relative h-dvh overflow-hidden">
        {loc.pathname === "/" ? <TechFloor /> : null}
        <div
          className={cn(
            "relative z-10 grid h-full min-h-0",
            edge === "top" && "grid-rows-[auto_minmax(0,1fr)]",
            edge === "bottom" && "grid-rows-[minmax(0,1fr)_auto]",
            edge === "left" && "grid-cols-[auto_minmax(0,1fr)]",
            edge === "right" && "grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          {edge === "bottom" || edge === "right" ? (
            <>
              {main}
              {chrome}
            </>
          ) : (
            <>
              {chrome}
              {main}
            </>
          )}
        </div>
        <JumpOverlay open={findOpen} onOpenChange={setFindOpen} cells={cells} hostItems={hostItems} />
      </div>
    </OpenPagesProvider>
  );
}
