import { useEffect, useState } from "react";
import type { Host, PluginRegister } from "@dawngrid/plugin-sdk";

type Status = "ready" | "pulling";

type ImageRow = {
  id: string;
  name: string;
  tag: string;
  size: string;
  pulled: string;
  status: Status;
  digest: string;
  layers: Array<{ id: string; weight: number; note: string }>;
};

const SEED: ImageRow[] = [
  {
    id: "host-ui",
    name: "dawn/host-ui",
    tag: "1.4.2",
    size: "412 MB",
    pulled: "2h ago",
    status: "ready",
    digest: "sha256:9c2e…a1",
    layers: [
      { id: "os", weight: 2, note: "base" },
      { id: "node", weight: 3, note: "runtime" },
      { id: "app", weight: 5, note: "bundle" },
    ],
  },
  {
    id: "lattice",
    name: "copper/lattice",
    tag: "nightly",
    size: "1.1 GB",
    pulled: "yesterday",
    status: "ready",
    digest: "sha256:11ab…c4",
    layers: [
      { id: "cuda", weight: 6, note: "cuda" },
      { id: "lib", weight: 2, note: "libs" },
      { id: "wts", weight: 4, note: "weights" },
    ],
  },
  {
    id: "agent",
    name: "cili/kube-agent",
    tag: "v0.9.1",
    size: "88 MB",
    pulled: "5d ago",
    status: "ready",
    digest: "sha256:77f0…12",
    layers: [
      { id: "go", weight: 3, note: "bin" },
      { id: "cfg", weight: 1, note: "cfg" },
    ],
  },
  {
    id: "torch",
    name: "train/torch-cu12",
    tag: "2.3.1",
    size: "3.4 GB",
    pulled: "12d ago",
    status: "ready",
    digest: "sha256:d0e8…9b",
    layers: [
      { id: "cu", weight: 7, note: "cuda" },
      { id: "torch", weight: 5, note: "torch" },
      { id: "ext", weight: 2, note: "ext" },
    ],
  },
];

function ImagesPage({ host }: { host: Host }) {
  const [rows, setRows] = useState(SEED);
  const [focus, setFocus] = useState(SEED[0].id);
  const selected = rows.find((row) => row.id === focus) ?? rows[0];
  const canWrite = host.can("images.write");

  useEffect(() => {
    const pulling = rows.find((row) => row.status === "pulling");
    if (!pulling) return;
    const id = window.setTimeout(() => {
      setRows((cur) =>
        cur.map((row) => (row.id === pulling.id && row.status === "pulling" ? { ...row, status: "ready", pulled: "just now" } : row)),
      );
    }, 900);
    return () => window.clearTimeout(id);
  }, [rows]);

  function pull() {
    if (!canWrite || !selected || selected.status === "pulling") return;
    setRows((cur) => cur.map((row) => (row.id === selected.id ? { ...row, status: "pulling" } : row)));
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">demo · in memory · refresh resets</p>
          <h1 className="text-2xl font-semibold tracking-tight">Images</h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{rows.length} in the catalog</p>
      </header>
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[16rem_minmax(0,1fr)]">
        <ul className="flex flex-col gap-1 overflow-auto">
          {rows.map((row) => {
            const on = row.id === selected.id;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setFocus(row.id)}
                  className={`flex w-full items-baseline justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    on ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <span className="truncate font-medium">{row.name}</span>
                  <span className={`shrink-0 font-mono text-[11px] ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {row.size}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {selected ? (
          <section className="bay-stage relative flex min-h-[22rem] flex-col gap-5 overflow-hidden rounded-lg border border-border p-5">
            <span className="bay-frame pointer-events-none absolute inset-0" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {selected.tag} · {selected.digest}
                </p>
                <h2 className="text-xl font-semibold tracking-tight">{selected.name}</h2>
              </div>
              <button
                type="button"
                disabled={!canWrite || selected.status === "pulling"}
                onClick={pull}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {selected.status === "pulling" ? "Pulling" : "Pull"}
              </button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              last pull {selected.pulled} · {selected.status}
            </p>
            <div className="mt-auto flex h-16 overflow-hidden rounded-md border border-border">
              {selected.layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-end border-r border-border last:border-r-0"
                  style={{ flexGrow: layer.weight, background: "color-mix(in oklch, var(--primary) 18%, transparent)" }}
                >
                  <span className="px-2 pb-1.5 font-mono text-[10px] text-muted-foreground">{layer.note}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export const register: PluginRegister = (host) => ({
  nav: [{ id: "images.catalog", label: "Images", path: "/images", permission: "images.read", icon: "layers" }],
  routes: [{ path: "", element: <ImagesPage host={host} /> }],
  permissions: ["images.read", "images.write"],
});
