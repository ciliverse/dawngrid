import { readFileSync } from "node:fs";
    import { resolve } from "node:path";
    import { parse as parseYaml } from "yaml";
    import { z } from "zod";
    import { repoRoot } from "../config.js";

    const embedSchema = z.object({
      mode: z.enum(["iframe", "proxy"]),
      origin: z.string().optional(),
    });

    const pluginYamlSchema = z.object({
      id: z.string(),
      kind: z.enum(["native", "adapter"]),
      name: z.string(),
      version: z.string(),
      nav: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          path: z.string(),
          permission: z.string().optional(),
          icon: z.string().optional(),
        }),
      ),
      routes: z.object({
        basePath: z.string(),
        frontend: z.object({
          package: z.string(),
          export: z.literal("register"),
        }),
      }),
      api: z.object({
        prefix: z.string(),
        stripPrefix: z.literal(true),
        upstreamPathPrefix: z.string(),
      }),
      embed: embedSchema.optional(),
      permissions: z.array(z.string()),
    });

    export type PluginYaml = z.infer<typeof pluginYamlSchema>;

    export function loadPluginYaml(pluginId: string): PluginYaml {
      const path = resolve(repoRoot(), "plugins", pluginId, "plugin.yaml");
      const parsed = pluginYamlSchema.parse(parseYaml(readFileSync(path, "utf8")));
      if (parsed.id !== pluginId) {
        throw new Error(`plugin.yaml id "${parsed.id}" does not match folder "${pluginId}"`);
      }
      if (parsed.routes.basePath !== `/${pluginId}`) {
        throw new Error(`basePath must be /${pluginId}`);
      }
      if (parsed.api.prefix !== `/api/${pluginId}`) {
        throw new Error(`api.prefix must be /api/${pluginId}`);
      }
      if (parsed.kind === "native" && parsed.embed) {
        throw new Error("kind native must not include embed");
      }
      if (parsed.kind === "adapter" && !parsed.embed) {
        throw new Error("kind adapter must include embed");
      }
      if (parsed.embed?.mode === "iframe") {
        const origin = parsed.embed.origin ?? "";
        let url: URL;
        try {
          url = new URL(origin);
        } catch {
          throw new Error(`embed.origin must be an absolute http(s) URL`);
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error(`embed.origin must be http or https`);
        }
        parsed.embed.origin = url.origin;
      }
      return parsed;
    }
