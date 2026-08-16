import { describe, expect, it } from "vitest";
import { frameStatusFromHeaders } from "./frame.js";

function headers(init: Record<string, string>): { get(name: string): string | null } {
  const map = new Map(Object.entries(init).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    get(name: string) {
      return map.get(name.toLowerCase()) ?? null;
    },
  };
}

describe("frameStatusFromHeaders", () => {
  it("blocks X-Frame-Options deny and sameorigin", () => {
    expect(frameStatusFromHeaders(headers({ "x-frame-options": "DENY" }))).toBe("blocked");
    expect(frameStatusFromHeaders(headers({ "X-Frame-Options": "sameorigin" }))).toBe("blocked");
  });

  it("blocks CSP frame-ancestors none or a closed list", () => {
    expect(
      frameStatusFromHeaders(headers({ "content-security-policy": "default-src 'self'; frame-ancestors 'none'" })),
    ).toBe("blocked");
    expect(
      frameStatusFromHeaders(headers({ "content-security-policy": "frame-ancestors 'self' https://github.com" })),
    ).toBe("blocked");
  });

  it("allows a page with no frame lock, or ancestors *", () => {
    expect(frameStatusFromHeaders(headers({}))).toBe("ok");
    expect(frameStatusFromHeaders(headers({ "content-security-policy": "default-src 'self'" }))).toBe("ok");
    expect(frameStatusFromHeaders(headers({ "content-security-policy": "frame-ancestors *" }))).toBe("ok");
  });
});
