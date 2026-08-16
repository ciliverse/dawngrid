import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Host } from "@dawngrid/plugin-sdk";
import { api, type EmbedCell, type PluginList } from "./api";
import { AccountPage } from "./pages/AccountPage";
import { AuditPage } from "./pages/AuditPage";
import { CellsPage } from "./pages/CellsPage";
import { EmbedPage } from "./pages/EmbedPage";
import { HomePage } from "./pages/HomePage";
import { LayoutPage } from "./pages/LayoutPage";
import { LoginPage } from "./pages/LoginPage";
import { OrgsPage } from "./pages/OrgsPage";
import { PluginsPage } from "./pages/PluginsPage";
import { RolesPage } from "./pages/RolesPage";
import { UsersPage } from "./pages/UsersPage";
import { PluginBoundary } from "./PluginBoundary";
import { loadPlugins } from "./plugins/loadPlugins";
import { useSession } from "./session";
import { Mark } from "./shell/Mark";
import { Shell } from "./shell/Shell";

export function App() {
  const { token, me, ready } = useSession();
  const nav = useNavigate();
  const loc = useLocation();

  const pluginsQuery = useQuery({
    queryKey: ["plugins", token],
    enabled: Boolean(token && me),
    queryFn: () => api<PluginList>("/api/plugins", { token }),
    retry: false,
  });

  const list = pluginsQuery.data;
  const loaded =
    list && me && token
      ? loadPlugins(list.plugins, (info) => {
          const host: Host = {
            pluginId: info.id,
            kind: info.kind,
            basePath: info.basePath,
            apiPrefix: info.apiPrefix,
            embed: info.embed,
            getToken: () => token,
            getUser: () => me.user,
            getScope: () => ({ orgId: me.scope.orgId, projectId: me.scope.projectId }),
            can: (perm) => me.perms.includes(perm),
            navigate: (to) => nav(to),
            theme: { tokens: {} },
          };
          return host;
        })
      : [];

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!ready || !me || pluginsQuery.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Mark className="text-foreground" />
          Opening host
        </div>
      </div>
    );
  }

  if (pluginsQuery.isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-destructive">
        {pluginsQuery.error instanceof Error ? pluginsQuery.error.message : "failed to load plugins"}
      </div>
    );
  }

  const embeds = list?.embeds ?? [];
  const active = loaded.find((p) => loc.pathname === p.info.basePath || loc.pathname.startsWith(`${p.info.basePath}/`));
  const embedMatch = loc.pathname.startsWith("/embed/");
  const flush = active?.info.kind === "adapter" || embedMatch;

  return (
    <Shell plugins={loaded} embeds={embeds} flush={flush}>
      <Routes>
        <Route path="/" element={<HomePage plugins={list?.plugins ?? []} embeds={embeds} />} />
        <Route path="/grid" element={<Navigate to="/" replace />} />
        <Route path="/admin/plugins" element={<PluginsPage />} />
        <Route path="/admin/cells" element={<CellsPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/roles" element={<RolesPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
        <Route path="/admin/orgs" element={<OrgsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/settings" element={<LayoutPage />} />
        <Route
          path="/embed/:id"
          element={<EmbedRoute embeds={embeds} />}
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        {loaded.flatMap(({ info, registration }) =>
          registration.routes.map((route) => (
            <Route
              key={`${info.id}:${route.path}`}
              path={`${info.basePath}/${route.path}`.replace(/\/+$/, "") || info.basePath}
              element={
                <PluginBoundary name={info.id}>
                  {info.kind === "adapter" ? (
                    <div className="absolute inset-0 min-h-0">{route.element}</div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col">{route.element}</div>
                  )}
                </PluginBoundary>
              }
            />
          )),
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function EmbedRoute({ embeds }: { embeds: EmbedCell[] }) {
  const { id } = useParams();
  const cell = embeds.find((e) => e.id === id);
  if (!cell) {
    return <div className="p-6 text-sm text-muted-foreground">Unknown embed.</div>;
  }
  return (
    <PluginBoundary name={cell.id}>
      <div className="absolute inset-0 min-h-0">
        <EmbedPage cell={cell} />
      </div>
    </PluginBoundary>
  );
}
