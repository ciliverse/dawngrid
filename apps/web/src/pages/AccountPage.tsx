import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../api";
import { useSession } from "../session";
import { PageHead } from "../shell/PageHead";

export function AccountPage() {
  const { token, me } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const changePassword = useMutation({
    mutationFn: () =>
      api<{ ok: true }>("/api/account/password", {
        method: "POST",
        token,
        body: JSON.stringify({ current, next }),
      }),
    onSuccess() {
      setCurrent("");
      setNext("");
      setErr(null);
      setOk(true);
    },
    onError(error) {
      setOk(false);
      setErr(error instanceof Error ? error.message : "failed to change password");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    changePassword.mutate();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHead title="You" hint="The host identity you are signed in as, and this project's password." />
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">This seat</h2>
          {me ? (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="w-28 text-muted-foreground">Username</dt>
                <dd className="font-mono text-primary">{me.user.username}</dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="w-28 text-muted-foreground">Display name</dt>
                <dd>{me.user.displayName}</dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="w-28 text-muted-foreground">Project</dt>
                <dd>{me.scope.projectName}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No session.</p>
          )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Password</h2>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-current">Current password</FieldLabel>
                <Input
                  id="account-current"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-next">New password</FieldLabel>
                <Input
                  id="account-next"
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              {err ? <p className="text-sm text-destructive">{err}</p> : null}
              {ok ? <p className="text-sm text-muted-foreground">Password updated.</p> : null}
              <Button type="submit" className="self-start" disabled={changePassword.isPending}>
                {changePassword.isPending ? <Spinner data-icon="inline-start" /> : null}
                Update password
              </Button>
            </FieldGroup>
          </form>
      </section>
    </div>
  );
}
