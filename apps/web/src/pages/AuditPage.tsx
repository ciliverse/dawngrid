import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type AuditItem } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

const LIMIT = 20;

function formatAt(at: string): string {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString();
}

function statusVariant(status: number): "secondary" | "destructive" | "outline" {
  if (status >= 400) return "destructive";
  if (status >= 200 && status < 300) return "secondary";
  return "outline";
}

export function AuditPage() {
  const { token } = useSession();
  const [userDraft, setUserDraft] = useState("");
  const [pluginDraft, setPluginDraft] = useState("");
  const [userId, setUserId] = useState("");
  const [pluginId, setPluginId] = useState("");
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ["audit", userId, pluginId, offset],
    enabled: Boolean(token),
    queryFn: () => {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (pluginId) params.set("pluginId", pluginId);
      params.set("limit", String(LIMIT));
      params.set("offset", String(offset));
      return api<{ items: AuditItem[]; total: number }>(`/api/audit?${params}`, { token });
    },
  });

  function onApply(e: FormEvent) {
    e.preventDefault();
    setUserId(userDraft.trim());
    setPluginId(pluginDraft.trim());
    setOffset(0);
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + LIMIT, total);
  const canPrev = offset > 0;
  const canNext = offset + LIMIT < total;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHead title="Audit" hint="Host API writes, filterable by user or plugin." />
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            {query.isLoading
              ? "Loading…"
              : query.isError
                ? query.error instanceof Error
                  ? query.error.message
                  : "failed to load audit"
                : `${total} matching`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form onSubmit={onApply} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
              <Label htmlFor="audit-user">User ID</Label>
              <Input
                id="audit-user"
                value={userDraft}
                onChange={(e) => setUserDraft(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
              <Label htmlFor="audit-plugin">Plugin ID</Label>
              <Input
                id="audit-plugin"
                value={pluginDraft}
                onChange={(e) => setPluginDraft(e.target.value)}
                placeholder="optional"
              />
            </div>
            <Button type="submit">Apply</Button>
          </form>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit events…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events for this filter.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {items.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                  <span className="font-mono text-xs text-muted-foreground">{formatAt(row.at)}</span>
                  <span className="min-w-0 font-medium">{row.username || row.userId}</span>
                  <span className="font-mono text-sm text-primary">{row.pluginId}</span>
                  <Badge variant="outline">{row.method}</Badge>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={row.path}>
                    {row.path}
                  </span>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "0 of 0" : `${from}-${to} of ${total}`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev || query.isFetching}
              onClick={() => setOffset((n) => Math.max(0, n - LIMIT))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext || query.isFetching}
              onClick={() => setOffset((n) => n + LIMIT)}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
