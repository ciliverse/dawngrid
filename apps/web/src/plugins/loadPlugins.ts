import type { Host, PluginRegistration } from "@dawngrid/plugin-sdk";
    import type { PluginInfo } from "../api";
    import { pluginRegisters } from "./catalog";

    export function loadPlugins(
      enabled: PluginInfo[],
      hostFor: (info: PluginInfo) => Host,
    ): Array<{ info: PluginInfo; registration: PluginRegistration }> {
      const out: Array<{ info: PluginInfo; registration: PluginRegistration }> = [];
      for (const info of enabled) {
        const register = pluginRegisters[info.id];
        if (!register) {
          throw new Error(`enabled plugin "${info.id}" has no frontend register()`);
        }
        const registration = register(hostFor(info));
        const yamlPerms = [...info.permissions].sort().join(",");
        const regPerms = [...registration.permissions].sort().join(",");
        if (yamlPerms !== regPerms) {
          throw new Error(`plugin "${info.id}" permissions mismatch yaml vs register()`);
        }
        out.push({ info, registration });
      }
      return out;
    }
