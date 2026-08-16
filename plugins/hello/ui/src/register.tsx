import { useState } from "react";
import type { Host, PluginRegister } from "@dawngrid/plugin-sdk";

function HelloPage({ host }: { host: Host }) {
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function call(method: "GET" | "POST") {
    setBusy(true);
    try {
      const token = host.getToken();
      const res = await fetch(`${host.apiPrefix}/echo${method === "GET" ? "?q=ping" : ""}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "POST" ? JSON.stringify({ note: "from dawngrid hello" }) : undefined,
      });
      const text = await res.text();
      setOut(`${res.status}\n${text}`);
    } catch (err) {
      setOut(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-border bg-card p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Hello</h1>
      <p className="text-sm text-muted-foreground">
        Independent echo process. Read uses <code>hello.read</code>; write uses the same gateway path
        with POST.
      </p>
      <div className="flex gap-2.5">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={busy || !host.can("hello.read")}
          onClick={() => void call("GET")}
        >
          GET /echo
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={busy || !host.can("hello.write")}
          onClick={() => void call("POST")}
        >
          POST /echo
        </button>
      </div>
      <pre className="min-h-36 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs">
        {out || "No request yet."}
      </pre>
    </div>
  );
}

export const register: PluginRegister = (host) => ({
  nav: [
    {
      id: "hello.echo",
      label: "Hello",
          path: "/hello",
          permission: "hello.read",
          icon: "spark",
    },
  ],
  routes: [{ path: "", element: <HelloPage host={host} /> }],
  permissions: ["hello.read", "hello.write"],
});
