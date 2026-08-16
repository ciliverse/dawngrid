import { useState } from "react";
import type { Host, PluginRegister } from "@dawngrid/plugin-sdk";

type RunStatus = "running" | "paused" | "queued" | "done";

type Run = {
  id: string;
  name: string;
  status: RunStatus;
  gpu: string;
  time: string;
  loss: string;
  log: string[];
};

const SEED: Run[] = [
  {
    id: "lattice-ft-07",
    name: "lattice-ft-07",
    status: "running",
    gpu: "A100 x2",
    time: "1h 12m",
    loss: "0.84",
    log: [
      "step 1840  loss 0.91  lr 2.0e-5",
      "step 1860  loss 0.88  lr 2.0e-5",
      "step 1880  loss 0.86  lr 1.9e-5",
      "step 1900  loss 0.84  lr 1.9e-5",
      "ckpt wrote /runs/lattice-ft-07/1900.pt",
    ],
  },
  {
    id: "vision-align",
    name: "vision-align",
    status: "queued",
    gpu: "H100 x4",
    time: "held",
    loss: "-",
    log: ["waiting for H100 x4", "queue position 2"],
  },
  {
    id: "hello-echo-sft",
    name: "hello-echo-sft",
    status: "done",
    gpu: "L40S x1",
    time: "38m",
    loss: "0.31",
    log: ["finished at step 800", "eval ppl 4.2", "artifact hello-echo-sft.pt"],
  },
  {
    id: "robot-policy-night",
    name: "robot-policy-night",
    status: "paused",
    gpu: "A100 x1",
    time: "22m",
    loss: "1.17",
    log: ["paused by operator", "last step 640  loss 1.17"],
  },
];

function TrainPage({ host }: { host: Host }) {
  const [runs, setRuns] = useState(SEED);
  const [focus, setFocus] = useState(SEED[0].id);
  const selected = runs.find((run) => run.id === focus) ?? runs[0];
  const canWrite = host.can("train.write");
  const canToggle = selected && (selected.status === "running" || selected.status === "paused");

  function toggle() {
    if (!canWrite || !selected || !canToggle) return;
    setRuns((cur) =>
      cur.map((run) =>
        run.id === selected.id
          ? { ...run, status: run.status === "running" ? "paused" : "running" }
          : run,
      ),
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">demo · in memory · refresh resets</p>
          <h1 className="text-2xl font-semibold tracking-tight">Train</h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {runs.filter((run) => run.status === "running").length} live
        </p>
      </header>
      {selected ? (
        <section className="bay-stage relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <span className="bay-frame pointer-events-none absolute inset-0" />
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">
                {selected.status} · {selected.gpu} · {selected.time}
              </p>
              <h2 className="text-xl font-semibold tracking-tight">{selected.name}</h2>
            </div>
            <button
              type="button"
              disabled={!canWrite || !canToggle}
              onClick={toggle}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {selected.status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
          <p className="px-5 pt-2 font-mono text-xs text-muted-foreground">loss {selected.loss}</p>
          <pre className="mt-4 min-h-0 flex-1 overflow-auto border-t border-border bg-background/60 px-5 py-3 font-mono text-xs leading-6 text-muted-foreground">
            {selected.log.join("\n")}
          </pre>
        </section>
      ) : null}
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {runs.map((run) => {
          const on = run.id === selected?.id;
          return (
            <li key={run.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setFocus(run.id)}
                className={`flex min-w-[9.5rem] flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                }`}
              >
                <span className="text-sm font-medium">{run.name}</span>
                <span className={`font-mono text-[11px] ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {run.status} · {run.gpu}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const register: PluginRegister = (host) => ({
  nav: [{ id: "train.runs", label: "Train", path: "/train", permission: "train.read", icon: "pulse" }],
  routes: [{ path: "", element: <TrainPage host={host} /> }],
  permissions: ["train.read", "train.write"],
});
