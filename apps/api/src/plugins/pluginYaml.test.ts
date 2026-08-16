import { describe, expect, it } from "vitest";
import { loadPluginYaml } from "./pluginYaml.js";

describe("loadPluginYaml", () => {
  it("loads native hello without embed", () => {
    const p = loadPluginYaml("hello");
    expect(p.kind).toBe("native");
    expect(p.embed).toBeUndefined();
  });

  it("loads adapter cluster and normalizes origin", () => {
    const p = loadPluginYaml("cluster");
    expect(p.kind).toBe("adapter");
    expect(p.embed).toEqual({ mode: "iframe", origin: "http://127.0.0.1:8888" });
  });

  it("loads native domain demos without embed", () => {
    for (const id of ["images", "train", "robot"] as const) {
      const p = loadPluginYaml(id);
      expect(p.kind).toBe("native");
      expect(p.embed).toBeUndefined();
      expect(p.routes.basePath).toBe(`/${id}`);
    }
  });
});
