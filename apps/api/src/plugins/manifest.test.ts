import { describe, expect, it } from "vitest";
    import {
      loadEnabledPlugins,
      MissingUpstreamError,
      resolveUpstreams,
      upstreamEnvName,
    } from "./manifest.js";

    describe("loadEnabledPlugins", () => {
      it("parses a valid list", () => {
        const plugins = loadEnabledPlugins(`
    plugins:
      - id: hello
        source: ./plugins/hello
        version: 0.1.0
    `);
        expect(plugins).toEqual([
          { id: "hello", source: "./plugins/hello", version: "0.1.0" },
        ]);
      });

      it("rejects duplicate ids", () => {
        expect(() =>
          loadEnabledPlugins(`
    plugins:
      - id: hello
        source: a
        version: "1"
      - id: hello
        source: b
        version: "1"
    `),
        ).toThrow(/duplicate plugin id "hello"/);
      });

      it("accepts a single home plugin", () => {
        const plugins = loadEnabledPlugins(`
    plugins:
      - id: hello
        source: ./plugins/hello
        version: 0.1.0
      - id: cluster
        source: ./plugins/cluster
        version: 0.1.0
        home: true
    `);
        expect(plugins.find((p) => p.id === "cluster")?.home).toBe(true);
      });

      it("rejects two home plugins", () => {
        expect(() =>
          loadEnabledPlugins(`
    plugins:
      - id: hello
        source: a
        version: "1"
        home: true
      - id: cluster
        source: b
        version: "1"
        home: true
    `),
        ).toThrow(/at most one plugin may set home/);
      });
    });

    describe("resolveUpstreams", () => {
      it("maps DAWNGRID_PLUGIN_<ID>_UPSTREAM", () => {
        const plugins = loadEnabledPlugins(`
    plugins:
      - id: hello
        source: ./plugins/hello
        version: 0.1.0
    `);
        expect(upstreamEnvName("hello")).toBe("DAWNGRID_PLUGIN_HELLO_UPSTREAM");
        const ups = resolveUpstreams(plugins, {
          DAWNGRID_PLUGIN_HELLO_UPSTREAM: "http://127.0.0.1:8791/",
        });
        expect(ups.hello).toBe("http://127.0.0.1:8791");
      });

      it("fails closed when the env is missing", () => {
        const plugins = loadEnabledPlugins(`
    plugins:
      - id: hello
        source: ./plugins/hello
        version: 0.1.0
    `);
        expect(() => resolveUpstreams(plugins, {})).toThrow(MissingUpstreamError);
      });
    });
