import { SignJWT, createLocalJWKSet, jwtVerify, type JWTPayload } from "jose";
    import type { KeyRing } from "./keys.js";

    export const JWT_AUD = "dawngrid-plugin";

    export type AccessClaims = {
      sub: string;
      org_id: string;
      project_id: string;
      perms: string[];
      sid: string;
    };

    export async function signAccessToken(
      ring: KeyRing,
      iss: string,
      claims: AccessClaims,
      ttlSec = 3600,
    ): Promise<string> {
      return new SignJWT({
        org_id: claims.org_id,
        project_id: claims.project_id,
        perms: claims.perms,
        sid: claims.sid,
      })
        .setProtectedHeader({ alg: "RS256", kid: ring.kid })
        .setIssuer(iss)
        .setAudience(JWT_AUD)
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(`${ttlSec}s`)
        .sign(ring.privateKey);
    }

    export async function verifyAccessToken(
      ring: KeyRing,
      iss: string,
      token: string,
    ): Promise<JWTPayload & AccessClaims> {
      const jwks = createLocalJWKSet({ keys: [ring.publicJwk] });
      const { payload } = await jwtVerify(token, jwks, {
        issuer: iss,
        audience: JWT_AUD,
      });
      return payload as JWTPayload & AccessClaims;
    }
