import { exportJWK, generateKeyPair, type JWK } from "jose";

    export type KeyRing = {
      kid: string;
      privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
      publicJwk: JWK;
    };

    export async function createKeyRing(): Promise<KeyRing> {
      const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
      const kid = "dawngrid";
      const publicJwk = await exportJWK(publicKey);
      publicJwk.kid = kid;
      publicJwk.alg = "RS256";
      publicJwk.use = "sig";
      return { kid, privateKey, publicJwk };
    }
