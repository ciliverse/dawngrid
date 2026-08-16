import { serve } from "@hono/node-server";
    import { Hono } from "hono";
    import { createRemoteJWKSet, jwtVerify } from "jose";

    const port = Number(process.env.DAWNGRID_HELLO_PORT ?? 8791);
    const secret = process.env.DAWNGRID_GATEWAY_SECRET ?? "dev-secret";
    const iss = (process.env.DAWNGRID_JWT_ISS ?? "http://127.0.0.1:8788/").replace(/\/?$/, "/");
    const jwks = createRemoteJWKSet(new URL(`${iss}api/.well-known/jwks.json`));

    const app = new Hono();

    app.use("*", async (c, next) => {
      if ((c.req.header("x-dawngrid-gateway-secret") ?? "") !== secret) {
        return c.json({ error: { category: "unauthenticated", message: "gateway secret rejected" } }, 401);
      }
      const auth = c.req.header("authorization") ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) {
        return c.json({ error: { category: "unauthenticated", message: "missing jwt" } }, 401);
      }
      try {
        await jwtVerify(token, jwks, { issuer: iss, audience: "dawngrid-plugin" });
      } catch {
        return c.json({ error: { category: "unauthenticated", message: "invalid jwt" } }, 401);
      }
      await next();
    });

    app.get("/echo", (c) =>
      c.json({
        ok: true,
        method: "GET",
        userId: c.req.header("x-dawngrid-user-id"),
        orgId: c.req.header("x-dawngrid-org-id"),
        projectId: c.req.header("x-dawngrid-project-id"),
        requestId: c.req.header("x-request-id"),
        q: c.req.query("q") ?? null,
      }),
    );

    app.post("/echo", async (c) => {
      const body = await c.req.json().catch(() => ({}));
      return c.json({
        ok: true,
        method: "POST",
        userId: c.req.header("x-dawngrid-user-id"),
        echo: body,
      });
    });

    serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (info) => {
      console.log(`[hello] http://${info.address}:${info.port}`);
    });
