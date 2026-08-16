import type { ReactNode } from "react";

export type PluginKind = "native" | "adapter";

export type HostUser = {
  id: string;
  username: string;
  displayName: string;
};

export type HostScope = {
  orgId: string;
  projectId: string;
};

export type PluginEmbed = {
  mode: "iframe" | "proxy";
  origin?: string;
};

export type Host = {
  pluginId: string;
  kind: PluginKind;
  basePath: string;
  apiPrefix: string;
  embed?: PluginEmbed;
  getToken(): string | null;
  getUser(): HostUser | null;
  getScope(): HostScope | null;
  can(permission: string): boolean;
  navigate(to: string): void;
  theme: { tokens: Record<string, string> };
};

export type PluginNavItem = {
  id: string;
  label: string;
  path: string;
  permission?: string;
  icon?: string;
  children?: PluginNavItem[];
};

export type PluginRoute = {
  path: string;
  element: ReactNode;
};

export type PluginRegistration = {
  nav: PluginNavItem[];
  routes: PluginRoute[];
  permissions: string[];
};

export type PluginRegister = (host: Host) => PluginRegistration;
