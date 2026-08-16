import { describe, expect, it } from "vitest";
import { canToggle, resolveLive, seedIds } from "./enabled.js";

describe("plugin enable overlay", () => {
  it("seeds all available ids when the store is empty", () => {
    expect(seedIds(["hello", "cluster"], [])).toEqual(["hello", "cluster"]);
  });

  it("keeps stored ids when the table already has rows", () => {
    expect(seedIds(["hello", "cluster", "train"], ["hello"])).toEqual(["hello"]);
  });

  it("live set is available intersect stored", () => {
    expect(resolveLive(["hello", "cluster"], ["hello", "gone"])).toEqual(["hello"]);
    expect(resolveLive(["hello", "cluster"], [])).toEqual([]);
  });

  it("refuses ids that are not in the yaml catalog", () => {
    expect(canToggle(["hello", "cluster"], "hello")).toBe(true);
    expect(canToggle(["hello", "cluster"], "nope")).toBe(false);
  });
});
