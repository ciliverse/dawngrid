import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, type AdminUser, type AuditItem, type EmbedCell, type PluginInfo } from "../api";
import { useSession } from "../session";
import { useDock } from "../shell/dock-context";
import { FloorView, type FloorCell } from "../shell/FloorView";
import { useOpenPages } from "../shell/open-pages-context";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function clockLabel(now: Date): string {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function HomePage({ plugins, embeds }: { plugins: PluginInfo[]; embeds: EmbedCell[] }) {
  const { token, me } = useSession();
  const { floor: floorStyle } = useDock();
  const { closeCell } = useOpenPages();
  const nav = useNavigate();
  const qc = useQueryClient();
  const canWrite = me?.scope.role !== "viewer";
  const [now, setNow] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [id, setId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const canAudit = Boolean(me?.perms.includes("host.audit.read"));
  const canPeople = Boolean(me?.perms.includes("host.users.read") || me?.perms.includes("host.users.write"));

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const auditQuery = useQuery({
    queryKey: ["audit-pulse", token],
    enabled: Boolean(token && canAudit),
    queryFn: () => api<{ items: AuditItem[]; total: number }>("/api/audit?limit=1", { token }),
  });

  const peopleQuery = useQuery({
    queryKey: ["users-pulse", token],
    enabled: Boolean(token && canPeople),
    queryFn: () => api<{ users: AdminUser[] }>("/api/users", { token }),
  });

  const create = useMutation({
    mutationFn: () =>
      api<EmbedCell>("/api/embeds", {
        method: "POST",
        token,
        body: JSON.stringify({ name, url, id: id.trim() || undefined }),
      }),
    onSuccess(row) {
      setName("");
      setUrl("");
      setId("");
      setErr(null);
      setAdding(false);
      void qc.invalidateQueries({ queryKey: ["plugins"] });
      nav(`/embed/${row.id}`);
    },
    onError(error) {
      setErr(error instanceof Error ? error.message : "failed to embed");
    },
  });

  const remove = useMutation({
    mutationFn: async (cell: FloorCell) => {
      if (cell.kind === "embed") {
        await api<{ ok: boolean }>(`/api/embeds/${cell.id}`, { method: "DELETE", token });
        return;
      }
      await api<{ id: string; enabled: boolean }>(`/api/plugins/${cell.id}/enabled`, {
        method: "PUT",
        token,
        body: JSON.stringify({ enabled: false }),
      });
    },
    onSuccess(_, cell) {
      closeCell(cell.key);
      void qc.invalidateQueries({ queryKey: ["plugins"] });
      void qc.invalidateQueries({ queryKey: ["plugin-catalog"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    create.mutate();
  }

  const cells: FloorCell[] = [
    ...plugins.map((p) => ({
      key: `plugin:${p.id}`,
      id: p.id,
      name: p.name,
      to: p.basePath,
      kind: p.kind,
      detail: p.basePath,
      meta: p.version,
      href: p.embed?.origin,
      home: Boolean(p.home),
      removable: canWrite,
    })),
    ...embeds.map((cell) => ({
      key: `embed:${cell.id}`,
      id: cell.id,
      name: cell.name,
      to: `/embed/${cell.id}`,
      kind: "embed",
      detail: cell.href,
      meta: formatWhen(cell.createdAt),
      href: cell.href,
      home: false,
      removable: canWrite,
    })),
  ];

  const floor = [...cells].sort((a, b) => Number(b.home) - Number(a.home));
  const focused = floor.find((cell) => cell.key === focusKey) ?? floor[0] ?? null;
  const who = me?.user.displayName || me?.user.username || "there";
  const people = peopleQuery.data?.users ?? [];
  const pulse = auditQuery.data?.items ?? [];
  const livePeople = people.filter((user) => !user.disabled).length;
  const latest = pulse[0];

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {clockLabel(now)}
            <span className="mx-1.5 text-border">/</span>
            {me?.scope.projectName ?? "no project"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, <span className="text-primary">{who}</span>
          </h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {focused ? `looking at ${focused.name}` : "no cells yet"}
          <span className="mx-1.5 text-border">/</span>
          {cells.length === 0 ? "dark" : `${cells.length} live`}
          {cells.length === 0 ? (
            <>
              <span className="mx-1.5 text-border">/</span>
              <Link to="/admin/plugins" className="text-primary hover:underline">
                Plugins
              </Link>
            </>
          ) : null}
        </p>
      </header>

      <FloorView
        style={floorStyle}
        floor={floor}
        focused={focused}
        onFocus={setFocusKey}
        wheelEnabled={!adding}
        onAdd={() => setAdding(true)}
        onRemove={(cellId, cellName) => {
          const cell = cells.find((item) => item.id === cellId);
          if (!cell) return;
          if (window.confirm(`Remove the "${cellName}" cell from this host?`)) {
            remove.mutate(cell);
          }
        }}
        removePending={remove.isPending}
      />

      {adding ? (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-background/70 p-4 backdrop-blur-[2px] md:items-center">
          <form
            className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-border bg-background p-5 shadow-lg"
            onSubmit={onSubmit}
          >
            <p className="text-sm font-medium">Paste a running UI</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="embed-name">Name</Label>
                <Input
                  id="embed-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Grafana"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="embed-id">Id (optional)</Label>
                <Input id="embed-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="grafana" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="embed-url">Page URL</Label>
              <Input
                id="embed-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://127.0.0.1:3000/"
                required
              />
            </div>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Spinner data-icon="inline-start" /> : null}
                Light it
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {canAudit || canPeople ? (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">
          {canAudit ? (
            latest ? (
              <p className="min-w-0 truncate">
                {formatWhen(latest.at)} {latest.username || latest.userId} {latest.pluginId} {latest.method} {latest.path}{" "}
                {latest.status}
              </p>
            ) : (
              <p>No host writes yet.</p>
            )
          ) : (
            <span />
          )}
          {canPeople ? (
            <p className="shrink-0">
              {livePeople} {livePeople === 1 ? "person" : "people"}
            </p>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
