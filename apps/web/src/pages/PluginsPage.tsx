import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, type PluginCatalog } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

export function PluginsPage() {
  const { token, me } = useSession();
  const qc = useQueryClient();
  const canWrite = me?.scope.role !== "viewer";

  const catalog = useQuery({
    queryKey: ["plugin-catalog"],
    enabled: Boolean(token),
    queryFn: () => api<PluginCatalog>("/api/plugins/catalog", { token }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api<{ id: string; enabled: boolean }>(`/api/plugins/${id}/enabled`, {
        method: "PUT",
        token,
        body: JSON.stringify({ enabled }),
      }),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ["plugin-catalog"] });
      void qc.invalidateQueries({ queryKey: ["plugins"] });
    },
  });

  const rows = catalog.data?.plugins ?? [];
  const on = rows.filter((row) => row.enabled);
  const off = rows.filter((row) => !row.enabled);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHead
        title="Plugins"
        hint="These come with the host. Take one off the floor, or put it back. URL cells stay on Cells."
      />
      {catalog.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading plugins
        </div>
      ) : catalog.isError ? (
        <p className="text-sm text-destructive">
          {catalog.error instanceof Error ? catalog.error.message : "failed to load plugins"}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-medium">On the floor</h2>
            {on.length === 0 ? (
              <p className="text-sm text-muted-foreground">None lit. Install one below.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {on.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {row.id}
                        <span className="mx-1.5 text-border">/</span>
                        {row.kind}
                      </p>
                    </div>
                    {row.home ? <Badge variant="secondary">home</Badge> : null}
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={toggle.isPending}
                        onClick={() => {
                          if (window.confirm(`Remove "${row.name}" from this host?`)) {
                            toggle.mutate({ id: row.id, enabled: false });
                          }
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-medium">Available</h2>
            {off.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every packaged plugin is on the floor.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {off.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {row.id}
                        <span className="mx-1.5 text-border">/</span>
                        {row.kind}
                      </p>
                    </div>
                    {canWrite ? (
                      <Button
                        type="button"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: row.id, enabled: true })}
                      >
                        Install
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
