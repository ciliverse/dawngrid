import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Mark } from "../shell/Mark";
import { ThemeToggle } from "../shell/ThemeToggle";
import { useSession } from "../session";

export function LoginPage() {
  const { login } = useSession();
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(username, password);
      nav("/", { replace: true });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dawn-wash relative grid min-h-dvh place-items-center px-4">
      <div className="horizon absolute inset-x-0 top-0" />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-7 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <Mark className="size-5" />
            <span className="text-sm font-semibold tracking-tight">Dawngrid</span>
          </div>
          <p className="max-w-[36ch] text-sm text-muted-foreground">One host. Cells light after you enter.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Use your host account.</p>
          <form className="mt-6" onSubmit={(e) => void onSubmit(e)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>
              {err ? <p className="text-sm text-destructive">{err}</p> : null}
              <Button type="submit" className="h-9 w-full" disabled={busy}>
                {busy ? <Spinner data-icon="inline-start" /> : null}
                {busy ? "Signing in" : "Enter"}
              </Button>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  );
}
