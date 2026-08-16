import { describe, expect, it } from "vitest";
import { collectJumpTargets, rankJumpTargets, shouldIgnoreJumpHotkey, type JumpTarget } from "./jump";

const cells = [
  { key: "hello", to: "/hello", label: "Hello", kind: "native" },
  { key: "embed:baidu", to: "/embed/baidu", label: "baidu", kind: "embed", href: "https://www.baidu.com" },
];

const hostItems = [
  { to: "/settings", label: "Layout" },
  { to: "/admin/users", label: "People" },
  { to: "/account", label: "You" },
];

describe("collectJumpTargets", () => {
  it("lists cells first, then Grid, then host pages", () => {
    const targets = collectJumpTargets(cells, hostItems);
    expect(targets.map((row) => row.label)).toEqual(["Hello", "baidu", "Grid", "Layout", "People", "You"]);
    expect(targets[2]).toMatchObject({ key: "host:grid", to: "/", kind: "host" });
  });
});

describe("rankJumpTargets", () => {
  const targets = collectJumpTargets(cells, hostItems);

  it("keeps cells ahead of host pages when the query is empty", () => {
    expect(rankJumpTargets(targets, "  ").map((row) => row.kind)).toEqual([
      "cell",
      "cell",
      "host",
      "host",
      "host",
      "host",
    ]);
  });

  it("ranks an exact label above a later substring", () => {
    const extra: JumpTarget[] = [
      ...targets,
      { key: "embed:hello-lab", to: "/embed/hello-lab", label: "Hello Lab", kind: "cell", hint: "embed" },
    ];
    expect(rankJumpTargets(extra, "hello").map((row) => row.label)).toEqual(["Hello", "Hello Lab"]);
  });

  it("finds a host page by prefix", () => {
    expect(rankJumpTargets(targets, "lay").map((row) => row.label)).toEqual(["Layout"]);
  });

  it("finds an embed by href", () => {
    expect(rankJumpTargets(targets, "baidu.com").map((row) => row.label)).toEqual(["baidu"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(rankJumpTargets(targets, "grafana")).toEqual([]);
  });
});

describe("shouldIgnoreJumpHotkey", () => {
  it("ignores typing in fields", () => {
    const input = { tagName: "INPUT", isContentEditable: false };
    const area = { tagName: "TEXTAREA", isContentEditable: false };
    const pick = { tagName: "SELECT", isContentEditable: false };
    const edit = { tagName: "DIV", isContentEditable: true };
    expect(shouldIgnoreJumpHotkey(input)).toBe(true);
    expect(shouldIgnoreJumpHotkey(area)).toBe(true);
    expect(shouldIgnoreJumpHotkey(pick)).toBe(true);
    expect(shouldIgnoreJumpHotkey(edit)).toBe(true);
  });

  it("does not ignore chrome buttons", () => {
    expect(shouldIgnoreJumpHotkey({ tagName: "BUTTON", isContentEditable: false })).toBe(false);
    expect(shouldIgnoreJumpHotkey(null)).toBe(false);
  });
});
