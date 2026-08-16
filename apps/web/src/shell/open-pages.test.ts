import { describe, expect, it } from "vitest";
import {
  cellKeyForPath,
  forgetOpen,
  isHostPath,
  pruneOpen,
  readOpenKeys,
  rememberOpen,
  writeOpenKeys,
} from "./open-pages";

const cells = [
  { key: "hello", to: "/hello" },
  { key: "images", to: "/images" },
  { key: "embed:lab", to: "/embed/lab" },
];

function memory(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    dump() {
      return store;
    },
  };
}

describe("readOpenKeys", () => {
  it("returns an empty list when storage is empty or invalid", () => {
    expect(readOpenKeys(memory())).toEqual([]);
    expect(readOpenKeys(memory({ "dawngrid.island.open": "nope" }))).toEqual([]);
    expect(readOpenKeys(memory({ "dawngrid.island.open": "[1]" }))).toEqual([]);
  });

  it("reads a string list", () => {
    expect(readOpenKeys(memory({ "dawngrid.island.open": '["hello","images"]' }))).toEqual(["hello", "images"]);
  });
});

describe("writeOpenKeys", () => {
  it("writes the list as JSON", () => {
    const store = memory();
    writeOpenKeys(["hello"], store);
    expect(store.dump()["dawngrid.island.open"]).toBe('["hello"]');
  });
});

describe("rememberOpen", () => {
  it("appends a new key and does not reorder an existing one", () => {
    expect(rememberOpen(["hello"], "images")).toEqual(["hello", "images"]);
    expect(rememberOpen(["hello", "images"], "hello")).toEqual(["hello", "images"]);
  });
});

describe("forgetOpen", () => {
  it("drops the key and leaves the rest", () => {
    expect(forgetOpen(["hello", "images"], "hello")).toEqual(["images"]);
    expect(forgetOpen(["images"], "hello")).toEqual(["images"]);
  });
});

describe("pruneOpen", () => {
  it("drops keys that are no longer known cells", () => {
    expect(pruneOpen(["hello", "gone", "images"], ["hello", "images"])).toEqual(["hello", "images"]);
  });
});

describe("cellKeyForPath", () => {
  it("matches a cell path and nested routes", () => {
    expect(cellKeyForPath(cells, "/images")).toBe("images");
    expect(cellKeyForPath(cells, "/images/dawn")).toBe("images");
    expect(cellKeyForPath(cells, "/embed/lab")).toBe("embed:lab");
  });

  it("returns null on the grid", () => {
    expect(cellKeyForPath(cells, "/")).toBeNull();
  });
});

describe("isHostPath", () => {
  it("treats grid and host pages as not open cells", () => {
    expect(isHostPath("/")).toBe(true);
    expect(isHostPath("/settings")).toBe(true);
    expect(isHostPath("/account")).toBe(true);
    expect(isHostPath("/admin/users")).toBe(true);
  });

  it("does not treat plugin pages as host pages", () => {
    expect(isHostPath("/hello")).toBe(false);
    expect(isHostPath("/embed/lab")).toBe(false);
  });
});
