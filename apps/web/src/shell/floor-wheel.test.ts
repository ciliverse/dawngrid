import { describe, expect, it } from "vitest";
import { shouldAcceptWheel, shouldIgnoreFloorWheel, stepFocus, WHEEL_GAP_MS } from "./floor-wheel";

const keys = ["cluster", "hello", "images", "train"];

describe("stepFocus", () => {
  it("moves down to the next key and up to the previous", () => {
    expect(stepFocus(keys, "hello", 1)).toBe("images");
    expect(stepFocus(keys, "hello", -1)).toBe("cluster");
  });

  it("stops at the ends", () => {
    expect(stepFocus(keys, "cluster", -1)).toBe("cluster");
    expect(stepFocus(keys, "train", 1)).toBe("train");
  });

  it("starts at the first key when nothing is focused", () => {
    expect(stepFocus(keys, null, 1)).toBe("cluster");
    expect(stepFocus(keys, null, -1)).toBe("cluster");
  });

  it("returns null when the floor is empty", () => {
    expect(stepFocus([], null, 1)).toBeNull();
  });
});

describe("shouldIgnoreFloorWheel", () => {
  it("ignores typing in fields", () => {
    expect(shouldIgnoreFloorWheel({ tagName: "INPUT", isContentEditable: false })).toBe(true);
    expect(shouldIgnoreFloorWheel({ tagName: "TEXTAREA", isContentEditable: false })).toBe(true);
    expect(shouldIgnoreFloorWheel({ tagName: "SELECT", isContentEditable: false })).toBe(true);
    expect(shouldIgnoreFloorWheel({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("does not ignore the floor itself", () => {
    expect(shouldIgnoreFloorWheel({ tagName: "BUTTON", isContentEditable: false })).toBe(false);
    expect(shouldIgnoreFloorWheel({ tagName: "DIV", isContentEditable: false })).toBe(false);
    expect(shouldIgnoreFloorWheel(null)).toBe(false);
  });
});

describe("shouldAcceptWheel", () => {
  it("accepts the first tick and rejects one inside the gap", () => {
    expect(WHEEL_GAP_MS).toBe(280);
    expect(shouldAcceptWheel(1000, 0, WHEEL_GAP_MS)).toBe(true);
    expect(shouldAcceptWheel(1279, 1000, WHEEL_GAP_MS)).toBe(false);
    expect(shouldAcceptWheel(1280, 1000, WHEEL_GAP_MS)).toBe(true);
  });
});
