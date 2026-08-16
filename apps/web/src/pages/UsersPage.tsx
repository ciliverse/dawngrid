import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { api, type AdminUser, type RoleName } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

const ROLES: RoleName[] = ["viewer", "operator", "admin"];

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function UsersPage() {
  const { token, me } = useSession();
  const qc = useQueryClient();
  const canWrite = Boolean(me?.perms.includes("host.users.write"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<RoleName>("viewer");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users"],
    enabled: Boolean(token),
    queryFn: () => api<{ users: AdminUser[] }>("/api/users", { token }),
  });

  const create = useMutation({
    mutationFn: () =>
      api<AdminUser>("/api/users", {
        method: "POST",
        token,
        body: JSON.stringify({ username, password, displayName, role }),
      }),
    onSuccess() {
      setUsername("");
      setPassword("");
      setDisplayName("");
      setRole("viewer");
      setFormErr(null);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError(error) {
      setFormErr(error instanceof Error ? error.message : "failed to create user");
    },
  });

  const patch = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      displayName?: string;
      disabled?: boolean;
      role?: RoleName;
    }) =>
      api<AdminUser>(`/api/users/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }),
    onSuccess() {
      setRowErr(null);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError(error) {
      setRowErr(error instanceof Error ? error.message : "failed to update user");
    },
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, nextPassword }: { id: string; nextPassword: string }) =>
      api<{ ok: true }>(`/api/users/${id}/reset-password`, {
        method: "POST",
        token,
        body: JSON.stringify({ password: nextPassword }),
      }),
    onSuccess() {
      setRowErr(null);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError(error) {
      setRowErr(error instanceof Error ? error.message : "failed to reset password");
    },
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    create.mutate();
  }

  function onResetPassword(user: AdminUser) {
    const nextPassword = window.prompt(`New password for ${user.username}`);
    if (!nextPassword) return;
    resetPassword.mutate({ id: user.id, nextPassword });
  }

  const users = usersQuery.data?.users ?? [];
  const rowBusy = patch.isPending || resetPassword.isPending;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHead title="People" hint="Who can sign into this project. Create, disable, or reset a password here." />
      {canWrite ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-medium">New person</h2>
            <form onSubmit={onCreate}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="user-username">Username</FieldLabel>
                  <Input
                    id="user-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-password">Password</FieldLabel>
                  <Input
                    id="user-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-display-name">Display name</FieldLabel>
                  <Input
                    id="user-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-role">Role</FieldLabel>
                  <NativeSelect
                    id="user-role"
                    className="w-full"
                    value={role}
                    onChange={(e) => setRole(e.target.value as RoleName)}
                  >
                    {ROLES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {formErr ? <p className="text-sm text-destructive">{formErr}</p> : null}
                <Button type="submit" className="self-start" disabled={create.isPending}>
                  {create.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Create
                </Button>
              </FieldGroup>
            </form>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">On this project</h2>
          {usersQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading users
            </div>
          ) : usersQuery.isError ? (
            <p className="text-sm text-destructive">
              {usersQuery.error instanceof Error ? usersQuery.error.message : "failed to load users"}
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rowErr ? <p className="text-sm text-destructive">{rowErr}</p> : null}
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {users.map((user) => (
                  <li key={user.id} className="flex flex-col gap-3 px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm text-primary">{user.username}</span>
                      <span className="min-w-0 flex-1">{user.displayName}</span>
                      <Badge variant="secondary">{user.role}</Badge>
                      {user.disabled ? <Badge variant="destructive">disabled</Badge> : null}
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatCreatedAt(user.createdAt)}
                      </span>
                    </div>
                    {canWrite ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <NativeSelect
                          aria-label={`Role for ${user.username}`}
                          className="h-8"
                          value={user.role}
                          disabled={rowBusy}
                          onChange={(e) =>
                            patch.mutate({ id: user.id, role: e.target.value as RoleName })
                          }
                        >
                          {ROLES.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rowBusy}
                          onClick={() => patch.mutate({ id: user.id, disabled: !user.disabled })}
                        >
                          {user.disabled ? "Enable" : "Disable"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rowBusy}
                          onClick={() => onResetPassword(user)}
                        >
                          Reset password
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </section>
    </div>
  );
}
