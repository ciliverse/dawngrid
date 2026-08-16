import { describe, expect, it } from "vitest";
    import { rewriteUpstreamPath } from "./proxy.js";

    describe("rewriteUpstreamPath", () => {
      it("strips /api/hello and leaves /echo", () => {
        expect(
          rewriteUpstreamPath({
            prefix: "/api/hello",
            upstreamPathPrefix: "",
            requestPath: "/api/hello/echo",
          }),
        ).toBe("/echo");
      });

      it("re-applies a product /api prefix", () => {
        expect(
          rewriteUpstreamPath({
            prefix: "/api/train",
            upstreamPathPrefix: "/api",
            requestPath: "/api/train/runs",
          }),
        ).toBe("/api/runs");
      });
    });
