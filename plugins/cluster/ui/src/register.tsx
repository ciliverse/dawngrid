import type { Host, PluginRegister } from "@dawngrid/plugin-sdk";

function embedSrc(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}/`;
  } catch {
    return null;
  }
}

function ClusterFrame({ host }: { host: Host }) {
  const src = embedSrc(host.embed?.origin);
  if (!src) {
    return (
      <div className="p-6 text-sm text-destructive">
        Adapter embed.origin is missing or not http(s).
      </div>
    );
  }
  return (
    <iframe
      title={host.pluginId}
      src={src}
      className="absolute inset-0 size-full border-0 bg-background"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}

export const register: PluginRegister = (host) => ({
  nav: [
    {
      id: "cluster.console",
      label: "Cluster",
      path: "/cluster",
      permission: "cluster.read",
      icon: "grid",
    },
  ],
  routes: [{ path: "", element: <ClusterFrame host={host} /> }],
  permissions: ["cluster.read", "cluster.write"],
});
