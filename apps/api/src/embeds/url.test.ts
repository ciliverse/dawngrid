import { describe, expect, it } from "vitest";
import { assertEmbedId, parsePageUrl, slugifyId } from "./url.js";

describe("parsePageUrl", () => {
  it("keeps path and drops hash", () => {
    expect(parsePageUrl("http://127.0.0.1:8888/ai#x")).toBe("http://127.0.0.1:8888/ai");
  });

  it("rejects non-http", () => {
    expect(() => parsePageUrl("javascript:alert(1)")).toThrow(/http/);
  });
});

describe("assertEmbedId", () => {
  it("blocks reserved and taken ids", () => {
    expect(() => assertEmbedId("admin", new Set())).toThrow(/reserved/);
    expect(() => assertEmbedId("hello", new Set(["hello"]))).toThrow(/already used/);
    expect(assertEmbedId("grafana", new Set(["hello"]))).toBe("grafana");
  });

  it("slugifies a label", () => {
    expect(slugifyId("Grafana Prod")).toBe("grafana-prod");
  });
});
