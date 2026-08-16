import { FormEvent, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, type EmbedCell, type PluginList } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

type FrameHint = { status: "ok" | "blocked" | "unknown" };

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CellsPage() {
  const { token, me } = useSession();
  const qc = useQueryClient();
  const canWrite = me?.scope.role !== "viewer";

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [url, setUrl] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; url: string }>>({});

  const listQuery = useQuery({
    queryKey: ["plugins"],
    enabled: Boolean(token),
    queryFn: () => api<PluginList>("/api/plugins", { token }),
  });

  const embeds = listQuery.data?.embeds ?? [];

  const frames = useQueries({
    queries: embeds.map((cell) => ({
      queryKey: ["embed-frame", cell.id],
      enabled: Boolean(token && cell.id),
      queryFn: () => api<FrameHint>(`/api/embeds/${cell.id}/frame`, { token }),
      staleTime: 60_000,
    })),
  });

  const create = useMutation({
    mutationFn: () =>
      api<EmbedCell>("/api/embeds", {
        method: "POST",
        token,
        body: JSON.stringify({ name, url, id: id.trim() || undefined }),
      }),
    onSuccess() {
      setName("");
      setId("");
      setUrl("");
      setFormErr(null);
      void qc.invalidateQueries({ queryKey: ["plugins"] });
    },
    onError(error) {
      setFormErr(error instanceof Error ? error.message : "failed to create cell");
    },
  });

  const patch = useMutation({
    mutationFn: ({ id: embedId, name: nextName, url: nextUrl }: { id: string; name: string; url: string }) =>
      api<EmbedCell>(`/api/embeds/${embedId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ name: nextName, url: nextUrl }),
      }),
    onSuccess(_, vars) {
      setRowErr(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      void qc.invalidateQueries({ queryKey: ["plugins"] });
      void qc.invalidateQueries({ queryKey: ["embed-frame", vars.id] });
    },
    onError(error) {
      setRowErr(error instanceof Error ? error.message : "failed to update cell");
    },
  });

  const remove = useMutation({
    mutationFn: (embedId: string) => api<{ ok: boolean }>(`/api/embeds/${embedId}`, { method: "DELETE", token }),
    onSuccess() {
      setRowErr(null);
      void qc.invalidateQueries({ queryKey: ["plugins"] });
    },
    onError(error) {
      setRowErr(error instanceof Error ? error.message : "failed to remove cell");
    },
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    create.mutate();
  }

  function draftFor(cell: EmbedCell) {
    return drafts[cell.id] ?? { name: cell.name, url: cell.href };
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHead
        title="Cells"
        hint="Paste a running UI. Change the name or address later. Pages that refuse a frame can still open in a new tab."
      />
      {canWrite ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-medium">New URL</h2>
          <form onSubmit={onCreate}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="cell-name">Name</FieldLabel>
                <Input
                  id="cell-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Grafana"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cell-id">Id (optional)</FieldLabel>
                <Input id="cell-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="grafana" />
              </Field>
              <Field>
                <FieldLabel htmlFor="cell-url">Page URL</FieldLabel>
                <Input
                  id="cell-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://127.0.0.1:3000/"
                  required
                />
              </Field>
              {formErr ? <p className="text-sm text-destructive">{formErr}</p> : null}
              <Button type="submit" className="self-start" disabled={create.isPending}>
                {create.isPending ? <Spinner data-icon="inline-start" /> : null}
                Light it
              </Button>
            </FieldGroup>
          </form>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Pasted URLs</h2>
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading cells
          </div>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">
            {listQuery.error instanceof Error ? listQuery.error.message : "failed to load cells"}
          </p>
        ) : embeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pasted URLs yet. Add one here or from the grid.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rowErr ? <p className="text-sm text-destructive">{rowErr}</p> : null}
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {embeds.map((cell, index) => {
                const draft = draftFor(cell);
                const dirty = draft.name !== cell.name || draft.url !== cell.href;
                const status = frames[index]?.data?.status;
                return (
                  <li key={cell.id} className="flex flex-col gap-3 px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-primary">{cell.id}</span>
                      {status === "blocked" ? <Badge variant="secondary">won't frame</Badge> : null}
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{formatWhen(cell.createdAt)}</span>
                    </div>
                    {canWrite ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          aria-label={`Name for ${cell.id}`}
                          value={draft.name}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [cell.id]: { ...draft, name: e.target.value } }))
                          }
                        />
                        <Input
                          aria-label={`URL for ${cell.id}`}
                          value={draft.url}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [cell.id]: { ...draft, url: e.target.value } }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <p className="truncate text-sm">{cell.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{cell.href}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={`/embed/${cell.id}`}>Open</Link>
                      </Button>
                      {status === "blocked" ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <a href={cell.href} target="_blank" rel="noreferrer">
                            Open in a new tab
                          </a>
                        </Button>
                      ) : null}
                      {canWrite ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!dirty || patch.isPending}
                            onClick={() => patch.mutate({ id: cell.id, name: draft.name, url: draft.url })}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (window.confirm(`Remove the "${cell.name}" cell from this host?`)) {
                                remove.mutate(cell.id);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
