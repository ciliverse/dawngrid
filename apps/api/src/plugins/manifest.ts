import { parse as parseYaml } from "yaml";
    import { z } from "zod";

    const idSchema = z
      .string()
      .regex(/^[a-z][a-z0-9-]{0,31}$/, "plugin id must match [a-z][a-z0-9-]{0,31}");

    const enabledFileSchema = z.object({
      plugins: z.array(
        z.object({
          id: idSchema,
          source: z.string().min(1),
          version: z.string().min(1),
          home: z.boolean().optional(),
        }),
      ),
    });

    export type EnabledPlugin = {
      id: string;
      source: string;
      version: string;
      home?: boolean;
    };

    export class ManifestError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "ManifestError";
      }
    }

    export class MissingUpstreamError extends Error {
      readonly envName: string;
      readonly pluginId: string;

      constructor(pluginId: string, envName: string) {
        super(`missing upstream for plugin "${pluginId}": set ${envName}`);
        this.name = "MissingUpstreamError";
        this.pluginId = pluginId;
        this.envName = envName;
      }
    }

    export function upstreamEnvName(pluginId: string): string {
      return `DAWNGRID_PLUGIN_${pluginId.toUpperCase().replace(/-/g, "_")}_UPSTREAM`;
    }

    export function loadEnabledPlugins(yamlText: string): EnabledPlugin[] {
      const raw = parseYaml(yamlText) ?? {};
      const parsed = enabledFileSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ManifestError(parsed.error.issues.map((i) => i.message).join("; "));
      }
      const seen = new Set<string>();
      let homes = 0;
      for (const plugin of parsed.data.plugins) {
        if (seen.has(plugin.id)) {
          throw new ManifestError(`duplicate plugin id "${plugin.id}"`);
        }
        seen.add(plugin.id);
        if (plugin.home) homes += 1;
      }
      if (homes > 1) {
        throw new ManifestError("at most one plugin may set home: true");
      }
      return parsed.data.plugins;
    }

    export function resolveUpstreams(
      plugins: EnabledPlugin[],
      env: NodeJS.ProcessEnv,
    ): Record<string, string> {
      const out: Record<string, string> = {};
      for (const plugin of plugins) {
        const key = upstreamEnvName(plugin.id);
        const value = (env[key] ?? "").trim().replace(/\/$/, "");
        if (!value) {
          throw new MissingUpstreamError(plugin.id, key);
        }
        out[plugin.id] = value;
      }
      return out;
    }
