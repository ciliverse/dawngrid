import { describe, expect, it } from "vitest";
    import { JWT_AUD, signAccessToken, verifyAccessToken } from "./jwt.js";
    import { createKeyRing } from "./keys.js";
    import { jwtVerify } from "jose";

    describe("access token", () => {
      it("round-trips through the JWKS public key", async () => {
        const ring = await createKeyRing();
        const iss = "http://127.0.0.1:8788/";
        const token = await signAccessToken(ring, iss, {
          sub: "user-1",
          org_id: "org-1",
          project_id: "proj-1",
          perms: ["hello.read"],
          sid: "sid-1",
        });
        const claims = await verifyAccessToken(ring, iss, token);
        expect(claims.sub).toBe("user-1");
        expect(claims.perms).toEqual(["hello.read"]);
        expect(claims.sid).toBe("sid-1");
      });

      it("rejects the wrong audience", async () => {
        const ring = await createKeyRing();
        const iss = "http://127.0.0.1:8788/";
        const token = await signAccessToken(ring, iss, {
          sub: "user-1",
          org_id: "org-1",
          project_id: "proj-1",
          perms: [],
          sid: "sid-1",
        });
        const { createLocalJWKSet } = await import("jose");
        const jwks = createLocalJWKSet({ keys: [ring.publicJwk] });
        await expect(
          jwtVerify(token, jwks, { issuer: iss, audience: "other" }),
        ).rejects.toThrow();
        expect(JWT_AUD).toBe("dawngrid-plugin");
      });
    });
