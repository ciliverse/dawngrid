import type { PluginYaml } from "../plugins/pluginYaml.js";

export const HOST_PERMS = {
  viewer: ["host.roles.read"],
  operator: ["host.roles.read", "host.orgs.read", "host.audit.read"],
  admin: [
    "host.users.read",
    "host.users.write",
    "host.roles.read",
    "host.orgs.read",
    "host.orgs.write",
    "host.audit.read",
  ],
} as const;

export function permsForRole(
  role: "viewer" | "operator" | "admin",
  plugins: PluginYaml[],
): string[] {
  const host = [...HOST_PERMS[role]];
  const all = plugins.flatMap((p) => p.permissions);
  if (role === "admin") return [...host, ...all];
  const reads = plugins.flatMap((p) => p.permissions.filter((x) => x.endsWith(".read")));
  if (role === "viewer") return [...host, ...reads];
  return [...host, ...all];
}

export const ROLE_CATALOG: Array<{
  id: "viewer" | "operator" | "admin";
  name: string;
  description: string;
}> = [
  { id: "viewer", name: "Viewer", description: "Read plugin data. Cannot manage people or orgs." },
  { id: "operator", name: "Operator", description: "Read and write plugins. Can read audit and orgs." },
  { id: "admin", name: "Admin", description: "Full host control: users, orgs, members, and all plugins." },
];
