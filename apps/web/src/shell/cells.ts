import { Activity, AppWindow, Bot, Boxes, Layers, Sparkles, type LucideIcon } from "lucide-react";
import type { PluginRegistration } from "@dawngrid/plugin-sdk";
import type { EmbedCell, PluginInfo } from "../api";

const NAV_ICONS: Record<string, LucideIcon> = {
  spark: Sparkles,
  grid: Boxes,
  layers: Layers,
  pulse: Activity,
  bot: Bot,
};

export type CellLink = {
  key: string;
  to: string;
  label: string;
  kind: string;
  href?: string;
  icon: LucideIcon;
};

export function cellLinks(
  plugins: Array<{ info: PluginInfo; registration: PluginRegistration }>,
  embeds: EmbedCell[],
  can: (perm: string) => boolean,
): CellLink[] {
  return [
    ...plugins.flatMap(({ info, registration }) =>
      registration.nav
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({
          key: item.id,
          to: item.path,
          label: item.label,
          kind: info.kind,
          href: info.embed?.origin,
          icon: NAV_ICONS[item.icon ?? ""] ?? Boxes,
        })),
    ),
    ...embeds.map((cell) => ({
      key: `embed:${cell.id}`,
      to: `/embed/${cell.id}`,
      label: cell.name,
      kind: "embed",
      href: cell.href,
      icon: AppWindow,
    })),
  ];
}

export function cellActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
