import { serve } from "@hono/node-server";
    import { createApp, loadEnabledYamls } from "./app.js";
    import { createKeyRing } from "./auth/keys.js";
    import { loadConfig } from "./config.js";
    import { bootstrap, openDb } from "./store/db.js";

    const config = loadConfig();
    const pluginYamls = loadEnabledYamls(config.enabled.map((p) => p.id));
    const db = await openDb(config.dbPath);
    await bootstrap(db, config.bootstrapUser, config.bootstrapPassword);
    const ring = await createKeyRing();
    const app = createApp({ config, db, ring, pluginYamls });

    serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
      console.log(`[dawngrid-api] http://${info.address}:${info.port}`);
      console.log(`[dawngrid-api] plugins: ${config.enabled.map((p) => p.id).join(", ") || "(none)"}`);
    });
