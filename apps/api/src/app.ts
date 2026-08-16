import { Hono, type Context } from "hono";
    import { cors } from "hono/cors";
    import { randomUUID } from "node:crypto";
    import type { AppConfig } from "./config.js";
    import type { KeyRing } from "./auth/keys.js";
    import { signAccessToken, verifyAccessToken } from "./auth/jwt.js";
import { verifyPassword } from "./auth/password.js";
import { permsForRole } from "./auth/perms.js";
import { mountAdminRoutes } from "./admin/routes.js";
import { rewriteUpstreamPath } from "./gateway/proxy.js";
import { canToggle, resolveLive, seedIds } from "./plugins/enabled.js";
import { loadPluginYaml, type PluginYaml } from "./plugins/pluginYaml.js";
import { probeFrameStatus } from "./embeds/frame.js";
import { assertEmbedId, parsePageUrl, slugifyId } from "./embeds/url.js";
import {
  createEmbed,
  createSession,
  deleteEmbed,
  findUserById,
  findUserByUsername,
  getEmbed,
  listEmbeds,
  listPluginEnabled,
  seedPluginEnabled,
  setPluginEnabled,
  updateEmbed,
  recordAudit,
  sessionValid,
  userScope,
  userScopeForProject,
  type Scope,
} from "./store/db.js";
import type { Store } from "./store/db.js";

    type Env = {
      Variables: {
        requestId: string;
        userId?: string;
        username?: string;
        displayName?: string;
        scope?: Scope;
        perms?: string[];
        sid?: string;
      };
    };

    export function createApp(opts: {
      config: AppConfig;
      db: Store;
      ring: KeyRing;
      pluginYamls: PluginYaml[];
    }) {
      const { config, db, ring, pluginYamls } = opts;
      const yamlById = new Map(pluginYamls.map((p) => [p.id, p]));
      const availableIds = pluginYamls.map((p) => p.id);

      async function livePluginIds(): Promise<string[]> {
        const stored = await listPluginEnabled(db);
        if (stored.length === 0) {
          const seeded = seedIds(availableIds, stored);
          await seedPluginEnabled(db, seeded);
          return seeded;
        }
        return resolveLive(availableIds, stored);
      }

      function pluginPayload(p: PluginYaml, live: Set<string>) {
        const listed = config.enabled.find((e) => e.id === p.id);
        return {
          id: p.id,
          kind: p.kind,
          name: p.name,
          version: p.version,
          nav: p.nav,
          basePath: p.routes.basePath,
          apiPrefix: p.api.prefix,
          permissions: p.permissions,
          package: p.routes.frontend.package,
          embed: p.embed,
          source: listed?.source,
          home: Boolean(listed?.home) && live.has(p.id),
        };
      }
      const app = new Hono<Env>();

      app.use("*", async (c, next) => {
        const requestId = c.req.header("x-request-id") ?? randomUUID();
        c.set("requestId", requestId);
        c.header("X-Request-Id", requestId);
        await next();
      });

      app.use(
        "*",
        cors({
          origin: ["http://127.0.0.1:5178", "http://localhost:5178"],
          credentials: true,
        }),
      );

      app.get("/api/health", (c) => c.json({ ok: true }));

      app.get("/api/.well-known/jwks.json", (c) =>
        c.json({ keys: [ring.publicJwk] }),
      );

      app.post("/api/auth/login", async (c) => {
        const body = await c.req.json<{ username?: string; password?: string }>();
        const user = await findUserByUsername(db, body.username ?? "");
        if (!user || user.disabled || !verifyPassword(body.password ?? "", user.password_hash)) {
          return c.json({ error: { category: "unauthenticated", message: "invalid credentials" } }, 401);
        }
        const scope = await userScope(db, user.id);
        if (!scope) {
          return c.json({ error: { category: "forbidden", message: "no project" } }, 403);
        }
        const sid = await createSession(db, user.id);
        const perms = permsForRole(scope.role, pluginYamls);
        const token = await signAccessToken(ring, config.jwtIss, {
          sub: user.id,
          org_id: scope.orgId,
          project_id: scope.projectId,
          perms,
          sid,
        });
        return c.json({
          token,
          user: { id: user.id, username: user.username, displayName: user.display_name },
          scope: {
            orgId: scope.orgId,
            orgName: scope.orgName,
            projectId: scope.projectId,
            projectName: scope.projectName,
            role: scope.role,
          },
          perms,
        });
      });

      async function requireUser(c: Context<Env>) {
        const header = c.req.header("authorization") ?? "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (!token) return null;
        try {
          const claims = await verifyAccessToken(ring, config.jwtIss, token);
          if (!claims.sid || !(await sessionValid(db, claims.sid))) return null;
          const user = await findUserById(db, claims.sub ?? "");
          if (!user || user.disabled) return null;
          const scope = claims.project_id
            ? await userScopeForProject(db, user.id, claims.project_id)
            : await userScope(db, user.id);
          if (!scope) return null;
          c.set("userId", user.id);
          c.set("username", user.username);
          c.set("displayName", user.display_name);
          c.set("scope", scope);
          c.set("perms", Array.isArray(claims.perms) ? claims.perms : []);
          c.set("sid", claims.sid);
          return user;
        } catch {
          return null;
        }
      }

      app.get("/api/me", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        const scope = c.get("scope")!;
        return c.json({
          user: { id: user.id, username: user.username, displayName: user.display_name },
          scope: {
            orgId: scope.orgId,
            orgName: scope.orgName,
            projectId: scope.projectId,
            projectName: scope.projectName,
            role: scope.role,
          },
          perms: c.get("perms") ?? [],
        });
      });

      mountAdminRoutes(app, { db, config, ring, pluginYamls, requireUser });

      app.get("/api/plugins", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        const live = new Set(await livePluginIds());
        const home = config.enabled.find((p) => p.home && live.has(p.id));
        const embeds = await listEmbeds(db);
        return c.json({
          homePath: home ? `/${home.id}` : null,
          embeds,
          plugins: pluginYamls.filter((p) => live.has(p.id)).map((p) => pluginPayload(p, live)),
        });
      });

      app.get("/api/plugins/catalog", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        const live = new Set(await livePluginIds());
        return c.json({
          plugins: pluginYamls.map((p) => ({
            ...pluginPayload(p, live),
            enabled: live.has(p.id),
          })),
        });
      });

      app.put("/api/plugins/:id/enabled", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        if (c.get("scope")?.role === "viewer") {
          return c.json({ error: { category: "forbidden", message: "write role required" } }, 403);
        }
        const id = c.req.param("id");
        if (!canToggle(availableIds, id)) {
          return c.json({ error: { category: "not_found", message: "plugin not available" } }, 404);
        }
        const body = await c.req.json<{ enabled?: boolean }>();
        if (typeof body.enabled !== "boolean") {
          return c.json({ error: { category: "invalid", message: "enabled must be boolean" } }, 400);
        }
        await livePluginIds();
        await setPluginEnabled(db, id, body.enabled);
        void recordAudit(db, {
          user_id: user.id,
          plugin_id: "host",
          method: "PUT",
          path: `/api/plugins/${id}/enabled`,
          status: 200,
        });
        return c.json({ id, enabled: body.enabled });
      });

      app.post("/api/embeds", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        if (c.get("scope")?.role === "viewer") {
          return c.json({ error: { category: "forbidden", message: "write role required" } }, 403);
        }
        const body = await c.req.json<{ name?: string; url?: string; id?: string }>();
        const name = (body.name ?? "").trim();
        if (!name) {
          return c.json({ error: { category: "invalid", message: "name is required" } }, 400);
        }
        let href: string;
        let id: string;
        try {
          href = parsePageUrl(body.url ?? "");
          const taken = new Set<string>([
            ...pluginYamls.map((p) => p.id),
            ...(await listEmbeds(db)).map((e) => e.id),
          ]);
          id = assertEmbedId((body.id ?? "").trim() || slugifyId(name), taken);
        } catch (err) {
          return c.json(
            { error: { category: "invalid", message: err instanceof Error ? err.message : "invalid embed" } },
            400,
          );
        }
        const row = await createEmbed(db, { id, name, href });
        return c.json(row, 201);
      });

      app.patch("/api/embeds/:id", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        if (c.get("scope")?.role === "viewer") {
          return c.json({ error: { category: "forbidden", message: "write role required" } }, 403);
        }
        const body = await c.req.json<{ name?: string; url?: string }>();
        const name = body.name !== undefined ? body.name.trim() : undefined;
        if (name !== undefined && !name) {
          return c.json({ error: { category: "invalid", message: "name is required" } }, 400);
        }
        let href: string | undefined;
        try {
          if (body.url !== undefined) href = parsePageUrl(body.url);
        } catch (err) {
          return c.json(
            { error: { category: "invalid", message: err instanceof Error ? err.message : "invalid embed" } },
            400,
          );
        }
        if (name === undefined && href === undefined) {
          return c.json({ error: { category: "invalid", message: "name or url is required" } }, 400);
        }
        const row = await updateEmbed(db, c.req.param("id"), { name, href });
        if (!row) {
          return c.json({ error: { category: "not_found", message: "embed not found" } }, 404);
        }
        return c.json(row);
      });

      app.get("/api/embeds/:id/frame", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        const row = await getEmbed(db, c.req.param("id"));
        if (!row) {
          return c.json({ error: { category: "not_found", message: "embed not found" } }, 404);
        }
        const status = await probeFrameStatus(row.href);
        return c.json({ status });
      });

      app.delete("/api/embeds/:id", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        if (c.get("scope")?.role === "viewer") {
          return c.json({ error: { category: "forbidden", message: "write role required" } }, 403);
        }
        const ok = await deleteEmbed(db, c.req.param("id"));
        if (!ok) {
          return c.json({ error: { category: "not_found", message: "embed not found" } }, 404);
        }
        return c.json({ ok: true });
      });

      app.get("/api/embeds/:id", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        const row = await getEmbed(db, c.req.param("id"));
        if (!row) {
          return c.json({ error: { category: "not_found", message: "embed not found" } }, 404);
        }
        return c.json(row);
      });

      app.all("/api/:pluginId/*", async (c) => {
        const user = await requireUser(c);
        if (!user) {
          return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
        }
        const pluginId = c.req.param("pluginId");
        const yaml = yamlById.get(pluginId);
        const upstream = config.upstreams[pluginId];
        const live = new Set(await livePluginIds());
        if (!yaml || !upstream || !live.has(pluginId)) {
          return c.json({ error: { category: "not_found", message: "plugin not enabled" } }, 404);
        }
        const perms = c.get("perms") ?? [];
        if (!perms.some((p) => p.startsWith(`${pluginId}.`))) {
          return c.json({ error: { category: "forbidden", message: "no plugin permission" } }, 403);
        }
        const url = new URL(c.req.url);
        const destPath = rewriteUpstreamPath({
          prefix: yaml.api.prefix,
          upstreamPathPrefix: yaml.api.upstreamPathPrefix,
          requestPath: url.pathname,
        });
        const dest = `${upstream}${destPath}${url.search}`;
        const headers = new Headers();
        const auth = c.req.header("authorization");
        if (auth) headers.set("authorization", auth);
        headers.set("X-Dawngrid-User-Id", user.id);
        headers.set("X-Dawngrid-Org-Id", c.get("scope")!.orgId);
        headers.set("X-Dawngrid-Project-Id", c.get("scope")!.projectId);
        headers.set("X-Dawngrid-Gateway-Secret", config.gatewaySecret);
        headers.set("X-Request-Id", c.get("requestId"));
        const contentType = c.req.header("content-type");
        if (contentType) headers.set("content-type", contentType);

        const method = c.req.method;
        let body: ArrayBuffer | undefined;
        if (method !== "GET" && method !== "HEAD") {
          body = await c.req.arrayBuffer();
        }

        let status = 502;
        try {
          const res = await fetch(dest, { method, headers, body });
          status = res.status;
          const outHeaders = new Headers();
          const ct = res.headers.get("content-type");
          if (ct) outHeaders.set("content-type", ct);
          outHeaders.set("X-Request-Id", c.get("requestId"));
          return new Response(res.body, { status, headers: outHeaders });
        } catch {
          return c.json(
            { error: { category: "upstream_failed", message: "plugin upstream unreachable" } },
            502,
          );
        } finally {
          if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
            void recordAudit(db, {
              user_id: user.id,
              plugin_id: pluginId,
              method,
              path: yaml.api.prefix + "/*",
              status,
            });
          }
        }
      });

      return app;
    }

    export function loadEnabledYamls(enabledIds: string[]): PluginYaml[] {
      return enabledIds.map((id) => loadPluginYaml(id));
    }
