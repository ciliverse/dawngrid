import { useState } from "react";
import type { Host, PluginRegister } from "@dawngrid/plugin-sdk";

type BotStatus = "online" | "busy" | "offline";

type Bot = {
  id: string;
  name: string;
  status: BotStatus;
  battery: number;
  site: string;
  last: string;
  pose: string;
};

const SEED: Bot[] = [
  { id: "bay-04", name: "bay-04", status: "online", battery: 86, site: "yard-a", last: "4s", pose: "12.4, 3.1" },
  { id: "bay-11", name: "bay-11", status: "online", battery: 41, site: "yard-b", last: "9s", pose: "2.0, 18.7" },
  { id: "dock-2", name: "dock-2", status: "offline", battery: 12, site: "shop", last: "2h", pose: "dock" },
  { id: "rover-n7", name: "rover-n7", status: "busy", battery: 63, site: "yard-a", last: "1s", pose: "8.8, 9.0" },
];

function RobotPage({ host }: { host: Host }) {
  const [fleet, setFleet] = useState(SEED);
  const [focus, setFocus] = useState(SEED[0].id);
  const selected = fleet.find((bot) => bot.id === focus) ?? fleet[0];
  const canWrite = host.can("robot.write");
  const canDispatch = selected && selected.status !== "offline";

  function dispatch() {
    if (!canWrite || !selected || !canDispatch) return;
    setFleet((cur) =>
      cur.map((bot) =>
        bot.id === selected.id
          ? { ...bot, status: bot.status === "busy" ? "online" : "busy", last: "now" }
          : bot,
      ),
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">demo · in memory · refresh resets</p>
          <h1 className="text-2xl font-semibold tracking-tight">Robot</h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {fleet.filter((bot) => bot.status !== "offline").length} on the yard
        </p>
      </header>
      <ul className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {fleet.map((bot) => {
          const on = bot.id === selected?.id;
          return (
            <li key={bot.id} className="min-h-0">
              <button
                type="button"
                onClick={() => setFocus(bot.id)}
                className={`bay-stage relative flex h-full min-h-[8.5rem] w-full flex-col items-start justify-between overflow-hidden rounded-lg border p-4 text-left ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                }`}
              >
                <span className="bay-frame pointer-events-none absolute inset-0" />
                <span className="text-lg font-semibold tracking-tight">{bot.name}</span>
                <span className={`font-mono text-[11px] ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {bot.status} · {bot.site}
                </span>
                <span className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-background/30">
                  <span
                    className={on ? "bg-primary-foreground" : "bg-primary"}
                    style={{ width: `${bot.battery}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="font-mono text-xs text-muted-foreground">
            {selected.name} · {selected.pose} · {selected.battery}% · seen {selected.last}
          </p>
          <button
            type="button"
            disabled={!canWrite || !canDispatch}
            onClick={dispatch}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {selected.status === "busy" ? "Return" : "Dispatch"}
          </button>
        </footer>
      ) : null}
    </div>
  );
}

export const register: PluginRegister = (host) => ({
  nav: [{ id: "robot.fleet", label: "Robot", path: "/robot", permission: "robot.read", icon: "bot" }],
  routes: [{ path: "", element: <RobotPage host={host} /> }],
  permissions: ["robot.read", "robot.write"],
});
