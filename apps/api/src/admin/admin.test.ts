import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createKeyRing } from "../auth/keys.js";
import type { AppConfig } from "../config.js";
import { bootstrap, openDb } from "../store/db.js";

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), "dawngrid-admin-"));
  const db = await openDb(join(dir, "test.db"));
  await bootstrap(db, "admin", "admin123");
  const ring = await createKeyRing();
  const config: AppConfig = {
    host: "127.0.0.1",
    port: 0,
    jwtIss: "http://127.0.0.1:8788/",
    jwtSecretName: "test",
    gatewaySecret: "secret",
    bootstrapUser: "admin",
    bootstrapPassword: "admin123",
    dbPath: join(dir, "test.db"),
    enabled: [],
    upstreams: {},
  };
  const app = createApp({ config, db, ring, pluginYamls: [] });
  return { app };
}

async function login(app: ReturnType<typeof createApp>, username = "admin", password = "admin123") {
  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return { res, body: (await res.json()) as Record<string, unknown> };
}

describe("kernel admin", () => {
  it("returns role on login and /api/me", async () => {
    const { app } = await boot();
    const { res, body } = await login(app);
    expect(res.status).toBe(200);
    const scope = body.scope as { role: string };
    expect(scope.role).toBe("admin");
    const me = await app.request("/api/me", {
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { scope: { role: string }; perms: string[] };
    expect(meBody.scope.role).toBe("admin");
    expect(meBody.perms).toContain("host.users.write");
  });

  it("creates a user, lists roles, and rejects disabled login", async () => {
    const { app } = await boot();
    const { body } = await login(app);
    const token = body.token as string;
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };

    const created = await app.request("/api/users", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        username: "viewer1",
        password: "viewer1pass",
        displayName: "Viewer One",
        role: "viewer",
      }),
    });
    expect(created.status).toBe(201);
    const user = (await created.json()) as { id: string; role: string };
    expect(user.role).toBe("viewer");

    const roles = await app.request("/api/roles", { headers: auth });
    expect(roles.status).toBe(200);
    const roleBody = (await roles.json()) as { roles: Array<{ id: string }> };
    expect(roleBody.roles.map((r) => r.id)).toEqual(["viewer", "operator", "admin"]);

    const orgs = await app.request("/api/orgs", { headers: auth });
    expect(orgs.status).toBe(200);

    const disable = await app.request(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ disabled: true }),
    });
    expect(disable.status).toBe(200);

    const blocked = await login(app, "viewer1", "viewer1pass");
    expect(blocked.res.status).toBe(401);

    const audit = await app.request("/api/audit?limit=20&offset=0", { headers: auth });
    expect(audit.status).toBe(200);
    const auditBody = (await audit.json()) as { items: unknown[]; total: number };
    expect(auditBody.total).toBeGreaterThan(0);
  });
});
