import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Me } from "./api";

const TOKEN_KEY = "dawngrid.token";

type Session = {
  token: string | null;
  me: Me | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  ready: boolean;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const meQuery = useQuery({
    queryKey: ["me", token],
    enabled: Boolean(token),
    queryFn: () => api<Me>("/api/me", { token }),
    retry: false,
  });

  useEffect(() => {
    if (!token || !meQuery.isError) return;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, [token, meQuery.isError]);

  const loginMut = useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      api<Me & { token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess(out) {
      localStorage.setItem(TOKEN_KEY, out.token);
      setToken(out.token);
      qc.setQueryData(["me", out.token], {
        user: out.user,
        scope: out.scope,
        perms: out.perms,
      } satisfies Me);
    },
  });

  const value = useMemo<Session>(
    () => ({
      token,
      me: meQuery.data ?? null,
      ready: !token || meQuery.isSuccess || meQuery.isError,
      async login(username, password) {
        await loginMut.mutateAsync({ username, password });
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        qc.removeQueries({ queryKey: ["me"] });
      },
    }),
    [token, meQuery.data, meQuery.isSuccess, meQuery.isError, loginMut, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SessionProvider missing");
  return ctx;
}
