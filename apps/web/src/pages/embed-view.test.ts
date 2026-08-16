import { describe, expect, it } from "vitest";
import { embedIsEmptyBay } from "./embed-view";

describe("embedIsEmptyBay", () => {
  it("keeps the empty bay while the probe is out, or when it fails", () => {
    expect(embedIsEmptyBay({ pending: true, failed: false })).toBe(true);
    expect(embedIsEmptyBay({ pending: false, failed: true })).toBe(true);
  });

  it("uses the empty bay when the page refuses or the probe cannot tell", () => {
    expect(embedIsEmptyBay({ pending: false, failed: false, status: "blocked" })).toBe(true);
    expect(embedIsEmptyBay({ pending: false, failed: false, status: "unknown" })).toBe(true);
  });

  it("only frames a page after the probe says ok", () => {
    expect(embedIsEmptyBay({ pending: false, failed: false, status: "ok" })).toBe(false);
  });
});
