import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createKeyRing } from "../auth/keys.js";
import type { AppConfig } from "../config.js";
import { bootstrap, openDb } from "../store/db.js";
import type { PluginYaml } from "./pluginYaml.js";

const helloYaml: PluginYaml = {
  id: "hello",
  kind: "native",
  name: "Hello",
  version: "0.1.0",
  nav: [{ id: "hello.home", label: "Hello", path: "/hello" }],
  routes: { basePath: "/hello", frontend: { package: "@dawngrid/hello-plugin", export: "register" } },
  api: { prefix: "/api/hello", stripPrefix: true, upstreamPathPrefix: "" },
  permissions: ["hello.read", "hello.write"],
};

const clusterYaml: PluginYaml = {
  id: "cluster",
  kind: "adapter",
  name: "Cluster",
  version: "0.1.0",
  nav: [{ id: "cluster.home", label: "Cluster", path: "/cluster" }],
  routes: { basePath: "/cluster", frontend: { package: "@dawngrid/cluster-plugin", export: "register" } },
  api: { prefix: "/api/cluster", stripPrefix: true, upstreamPathPrefix: "" },
  embed: { mode: "iframe", origin: "http://127.0.0.1:8888" },
  permissions: ["cluster.read", "cluster.write"],
};

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), "dawngrid-enable-"));
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
    enabled: [
      { id: "hello", source: "./plugins/hello", version: "0.1.0" },
      { id: "cluster", source: "./plugins/cluster", version: "0.1.0", home: true },
    ],
    upstreams: { hello: "http://127.0.0.1:8791", cluster: "http://127.0.0.1:8080" },
  };
  const app = createApp({ config, db, ring, pluginYamls: [helloYaml, clusterYaml] });
  return { app };
}

async function login(app: ReturnType<typeof createApp>, username = "admin", password = "admin123") {
  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json()) as { token: string };
  return body.token;
}

describe("plugin enable API", () => {
  it("lists only live plugins and seeds the table on first read", async () => {
    const { app } = await boot();
    const token = await login(app);
    const res = await app.request("/api/plugins", { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { homePath: string | null; plugins: Array<{ id: string }> };
    expect(body.plugins.map((p) => p.id)).toEqual(["hello", "cluster"]);
    expect(body.homePath).toBe("/cluster");
  });

  it("catalog shows enabled flags after a disable", async () => {
    const { app } = await boot();
    const token = await login(app);
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const off = await app.request("/api/plugins/hello/enabled", {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ enabled: false }),
    });
    expect(off.status).toBe(200);

    const list = await app.request("/api/plugins", { headers: auth });
    const listBody = (await list.json()) as { plugins: Array<{ id: string }> };
    expect(listBody.plugins.map((p) => p.id)).toEqual(["cluster"]);

    const catalog = await app.request("/api/plugins/catalog", { headers: auth });
    expect(catalog.status).toBe(200);
    const cat = (await catalog.json()) as { plugins: Array<{ id: string; enabled: boolean }> };
    expect(cat.plugins).toEqual([
      expect.objectContaining({ id: "hello", enabled: false }),
      expect.objectContaining({ id: "cluster", enabled: true }),
    ]);
  });

  it("rejects unknown ids and viewer writes", async () => {
    const { app } = await boot();
    const token = await login(app);
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const unknown = await app.request("/api/plugins/nope/enabled", {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ enabled: true }),
    });
    expect(unknown.status).toBe(404);

    const created = await app.request("/api/users", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        username: "viewer1",
        password: "viewer1pass",
        displayName: "Viewer",
        role: "viewer",
      }),
    });
    expect(created.status).toBe(201);
    const viewerLogin = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "viewer1", password: "viewer1pass" }),
    });
    const viewer = (await viewerLogin.json()) as { token: string };
    const forbidden = await app.request("/api/plugins/hello/enabled", {
      method: "PUT",
      headers: { authorization: `Bearer ${viewer.token}`, "content-type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(forbidden.status).toBe(403);
  });

  it("stops the gateway after disable", async () => {
    const { app } = await boot();
    const token = await login(app);
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    await app.request("/api/plugins/hello/enabled", {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ enabled: false }),
    });
    const proxied = await app.request("/api/hello/echo", { headers: auth });
    expect(proxied.status).toBe(404);
  });
});
