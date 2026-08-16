import { useQuery } from "@tanstack/react-query";
import { api, type RoleInfo } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

export function RolesPage() {
  const { token } = useSession();
  const rolesQuery = useQuery({
    queryKey: ["roles", token],
    enabled: Boolean(token),
    queryFn: () => api<{ roles: RoleInfo[] }>("/api/roles", { token }),
  });

  const roles = rolesQuery.data?.roles ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHead title="Roles" hint="What each seat can touch. Host points plus whatever the lit cells add." />

      {rolesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roles…</p>
      ) : null}

      {rolesQuery.isError ? (
        <p className="text-sm text-destructive">
          {rolesQuery.error instanceof Error ? rolesQuery.error.message : "failed to load roles"}
        </p>
      ) : null}

      {!rolesQuery.isLoading && !rolesQuery.isError && roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles defined.</p>
      ) : null}

      {roles.map((role) => (
        <section key={role.id} className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-medium">{role.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
          </div>
          {role.permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions on this role.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {role.permissions.map((perm) => (
                <li
                  key={perm}
                  className="rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground"
                >
                  {perm}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
