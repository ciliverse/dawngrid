import { describe, expect, it } from "vitest";
import { PALETTES, readMode, readPalette } from "./theme";

describe("theme parse", () => {
  it("defaults to dawn light", () => {
    expect(readPalette(null)).toBe("dawn");
    expect(readPalette("")).toBe("dawn");
    expect(readPalette("nope")).toBe("dawn");
    expect(readMode(null)).toBe("light");
    expect(readMode("nope")).toBe("light");
  });

  it("accepts known palettes and modes", () => {
    expect(readPalette("ion")).toBe("ion");
    expect(readPalette("ink")).toBe("ion");
    expect(readPalette("tide")).toBe("tide");
    expect(readMode("dark")).toBe("dark");
    expect(PALETTES.map((item) => item.id)).toEqual(["dawn", "ion", "tide"]);
  });
});
