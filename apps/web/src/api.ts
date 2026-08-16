export type RoleName = "viewer" | "operator" | "admin";

export type Me = {
  user: { id: string; username: string; displayName: string };
  scope: {
    orgId: string;
    orgName: string;
    projectId: string;
    projectName: string;
    role: RoleName;
  };
  perms: string[];
};

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  disabled: boolean;
  createdAt: string;
  role: RoleName;
  projectId: string;
};

export type RoleInfo = {
  id: RoleName;
  name: string;
  description: string;
  permissions: string[];
};

export type AuditItem = {
  id: string;
  at: string;
  userId: string;
  username?: string;
  pluginId: string;
  method: string;
  path: string;
  status: number;
};

export type OrgRow = { id: string; name: string };
export type ProjectRow = { id: string; orgId: string; name: string };
export type MemberRow = { userId: string; username: string; displayName: string; role: RoleName };

export type PluginEmbed = {
  mode: "iframe" | "proxy";
  origin?: string;
};

export type PluginInfo = {
  id: string;
  kind: "native" | "adapter";
  name: string;
  version: string;
  nav: Array<{ id: string; label: string; path: string; permission?: string }>;
  basePath: string;
  apiPrefix: string;
  permissions: string[];
  package: string;
  embed?: PluginEmbed;
  source?: string;
  home?: boolean;
};

export type EmbedCell = {
  id: string;
  name: string;
  href: string;
  createdAt: string;
};

export type PluginList = {
  homePath: string | null;
  plugins: PluginInfo[];
  embeds: EmbedCell[];
};

export type CatalogPlugin = PluginInfo & { enabled: boolean };

export type PluginCatalog = {
  plugins: CatalogPlugin[];
};

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return (await res.json()) as T;
}
