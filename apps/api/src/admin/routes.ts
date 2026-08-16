import type { Context, Hono } from "hono";
import type { PluginYaml } from "../plugins/pluginYaml.js";
import { ROLE_CATALOG, permsForRole } from "../auth/perms.js";
import { signAccessToken } from "../auth/jwt.js";
import { verifyPassword } from "../auth/password.js";
import type { KeyRing } from "../auth/keys.js";
import type { AppConfig } from "../config.js";
import { recordAudit, userScopeForProject, type Scope, type Store, type UserRow } from "../store/db.js";
import {
  addMember,
  createAdminUser,
  createOrg,
  createProject,
  listAdminUsers,
  listAudit,
  listMembers,
  listOrgs,
  listProjects,
  patchAdminUser,
  patchMember,
  removeMember,
  setPassword,
} from "./store.js";

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

const ROLES = new Set(["viewer", "operator", "admin"]);

export function mountAdminRoutes(
  app: Hono<Env>,
  deps: {
    db: Store;
    config: AppConfig;
    ring: KeyRing;
    pluginYamls: PluginYaml[];
    requireUser: (c: Context<Env>) => Promise<UserRow | null>;
  },
) {
  const { db, config, ring, pluginYamls, requireUser } = deps;

  function hasPerm(c: Context<Env>, perm: string) {
    return (c.get("perms") ?? []).includes(perm);
  }

  function scopeJson(scope: Scope) {
    return {
      orgId: scope.orgId,
      orgName: scope.orgName,
      projectId: scope.projectId,
      projectName: scope.projectName,
      role: scope.role,
    };
  }

  app.get("/api/users", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.users.read") && !hasPerm(c, "host.users.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const users = await listAdminUsers(db, c.get("scope")!.projectId);
    return c.json({ users });
  });

  app.post("/api/users", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.users.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ username?: string; password?: string; displayName?: string; role?: string }>();
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const role = body.role ?? "viewer";
    if (!username || password.length < 6 || !ROLES.has(role)) {
      return c.json({ error: { category: "invalid", message: "username, password (>=6), and role required" } }, 400);
    }
    try {
      const row = await createAdminUser(db, {
        username,
        password,
        displayName: (body.displayName ?? username).trim(),
        role: role as "viewer" | "operator" | "admin",
        projectId: c.get("scope")!.projectId,
      });
      void recordAudit(db, {
        user_id: actor.id,
        plugin_id: "host",
        method: "POST",
        path: "/api/users",
        status: 201,
      });
      return c.json(row, 201);
    } catch {
      return c.json({ error: { category: "conflict", message: "username taken" } }, 409);
    }
  });

  app.patch("/api/users/:id", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.users.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ displayName?: string; disabled?: boolean; role?: string }>();
    if (body.role && !ROLES.has(body.role)) {
      return c.json({ error: { category: "invalid", message: "bad role" } }, 400);
    }
    const row = await patchAdminUser(db, c.req.param("id"), c.get("scope")!.projectId, {
      displayName: body.displayName,
      disabled: body.disabled,
      role: body.role as "viewer" | "operator" | "admin" | undefined,
    });
    if (!row) return c.json({ error: { category: "not_found", message: "user not found" } }, 404);
    void recordAudit(db, {
      user_id: actor.id,
      plugin_id: "host",
      method: "PATCH",
      path: `/api/users/${row.id}`,
      status: 200,
    });
    return c.json(row);
  });

  app.post("/api/users/:id/reset-password", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.users.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ password?: string }>();
    if (!body.password || body.password.length < 6) {
      return c.json({ error: { category: "invalid", message: "password too short" } }, 400);
    }
    const row = await patchAdminUser(db, c.req.param("id"), c.get("scope")!.projectId, {
      password: body.password,
    });
    if (!row) return c.json({ error: { category: "not_found", message: "user not found" } }, 404);
    return c.json({ ok: true });
  });

  app.post("/api/account/password", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    const body = await c.req.json<{ current?: string; next?: string }>();
    if (!body.next || body.next.length < 6) {
      return c.json({ error: { category: "invalid", message: "password too short" } }, 400);
    }
    if (!verifyPassword(body.current ?? "", user.password_hash)) {
      return c.json({ error: { category: "unauthenticated", message: "current password wrong" } }, 401);
    }
    await setPassword(db, user.id, body.next);
    return c.json({ ok: true });
  });

  app.get("/api/roles", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    const roles = ROLE_CATALOG.map((r) => ({
      ...r,
      permissions: permsForRole(r.id, pluginYamls),
    }));
    return c.json({ roles });
  });

  app.get("/api/audit", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.audit.read")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const url = new URL(c.req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
    const out = await listAudit(db, {
      userId: url.searchParams.get("userId") ?? undefined,
      pluginId: url.searchParams.get("pluginId") ?? undefined,
      limit,
      offset,
    });
    return c.json(out);
  });

  app.get("/api/orgs", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.read") && !hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    return c.json({ orgs: await listOrgs(db) });
  });

  app.post("/api/orgs", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ name?: string }>();
    const name = (body.name ?? "").trim();
    if (!name) return c.json({ error: { category: "invalid", message: "name required" } }, 400);
    const row = await createOrg(db, name);
    void recordAudit(db, { user_id: actor.id, plugin_id: "host", method: "POST", path: "/api/orgs", status: 201 });
    return c.json(row, 201);
  });

  app.get("/api/projects", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.read") && !hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    return c.json({ projects: await listProjects(db) });
  });

  app.post("/api/projects", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ orgId?: string; name?: string }>();
    try {
      const row = await createProject(db, body.orgId ?? "", (body.name ?? "").trim());
      return c.json(row, 201);
    } catch (err) {
      return c.json({ error: { category: "invalid", message: err instanceof Error ? err.message : "invalid" } }, 400);
    }
  });

  app.get("/api/projects/:id/members", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.read") && !hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    return c.json({ members: await listMembers(db, c.req.param("id")) });
  });

  app.post("/api/projects/:id/members", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ userId?: string; role?: string }>();
    if (!body.userId || !body.role || !ROLES.has(body.role)) {
      return c.json({ error: { category: "invalid", message: "userId and role required" } }, 400);
    }
    try {
      const row = await addMember(db, c.req.param("id"), body.userId, body.role as "viewer" | "operator" | "admin");
      return c.json(row, 201);
    } catch (err) {
      return c.json({ error: { category: "invalid", message: err instanceof Error ? err.message : "invalid" } }, 400);
    }
  });

  app.patch("/api/projects/:id/members/:userId", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const body = await c.req.json<{ role?: string }>();
    if (!body.role || !ROLES.has(body.role)) {
      return c.json({ error: { category: "invalid", message: "role required" } }, 400);
    }
    try {
      const row = await patchMember(db, c.req.param("id"), c.req.param("userId"), body.role as "viewer" | "operator" | "admin");
      return c.json(row);
    } catch (err) {
      return c.json({ error: { category: "not_found", message: err instanceof Error ? err.message : "not found" } }, 404);
    }
  });

  app.delete("/api/projects/:id/members/:userId", async (c) => {
    const actor = await requireUser(c);
    if (!actor) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    if (!hasPerm(c, "host.orgs.write")) {
      return c.json({ error: { category: "forbidden", message: "no permission" } }, 403);
    }
    const ok = await removeMember(db, c.req.param("id"), c.req.param("userId"));
    if (!ok) return c.json({ error: { category: "not_found", message: "member not found" } }, 404);
    return c.json({ ok: true });
  });

  app.post("/api/auth/switch-project", async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: { category: "unauthenticated", message: "login required" } }, 401);
    const body = await c.req.json<{ projectId?: string }>();
    const scope = await userScopeForProject(db, user.id, body.projectId ?? "");
    if (!scope) return c.json({ error: { category: "forbidden", message: "not a member" } }, 403);
    const perms = permsForRole(scope.role, pluginYamls);
    const sid = c.get("sid")!;
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
      scope: scopeJson(scope),
      perms,
    });
  });
}
