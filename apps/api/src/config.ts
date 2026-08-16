import { readFileSync } from "node:fs";
    import { dirname, resolve } from "node:path";
    import { fileURLToPath } from "node:url";
    import { loadEnabledPlugins, resolveUpstreams, type EnabledPlugin } from "./plugins/manifest.js";

    const here = dirname(fileURLToPath(import.meta.url));

    export function repoRoot(): string {
      return resolve(here, "../../..");
    }

    export type AppConfig = {
      host: string;
      port: number;
      jwtIss: string;
      jwtSecretName: string;
      gatewaySecret: string;
      bootstrapUser: string;
      bootstrapPassword: string;
      dbPath: string;
      enabled: EnabledPlugin[];
      upstreams: Record<string, string>;
    };

    export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
      const root = repoRoot();
      const enabledPath = resolve(root, "plugins.enabled.yaml");
      const enabled = loadEnabledPlugins(readFileSync(enabledPath, "utf8"));
      const upstreams = resolveUpstreams(enabled, env);
      return {
        host: env.DAWNGRID_HOST ?? "127.0.0.1",
        port: Number(env.DAWNGRID_PORT ?? 8788),
        jwtIss: (env.DAWNGRID_JWT_ISS ?? "http://127.0.0.1:8788/").replace(/\/?$/, "/"),
        jwtSecretName: "dawngrid",
        gatewaySecret: env.DAWNGRID_GATEWAY_SECRET ?? "dev-secret",
        bootstrapUser: env.DAWNGRID_BOOTSTRAP_USER ?? "admin",
        bootstrapPassword: env.DAWNGRID_BOOTSTRAP_PASSWORD ?? "admin123",
        dbPath: env.DAWNGRID_DB ?? resolve(root, "apps/api/data/dawngrid.db"),
        enabled,
        upstreams,
      };
    }
