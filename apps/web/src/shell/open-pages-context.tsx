import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CellLink } from "./cells";
import { cellKeyForPath, forgetOpen, isHostPath, pruneOpen, readOpenKeys, rememberOpen, writeOpenKeys } from "./open-pages";

type OpenPagesValue = {
  openKeys: string[];
  visibleCells: CellLink[];
  closeCell: (key: string) => void;
};

const OpenPagesContext = createContext<OpenPagesValue | null>(null);

function sessionStore(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function OpenPagesProvider({ cells, children }: { cells: CellLink[]; children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const store = sessionStore();
    return store ? readOpenKeys(store) : [];
  });
  const knownSig = cells.map((cell) => cell.key).join("\0");

  useEffect(() => {
    const known = knownSig ? knownSig.split("\0") : [];
    setOpenKeys((keys) => {
      const next = pruneOpen(keys, known);
      if (next.join("\0") === keys.join("\0")) return keys;
      const store = sessionStore();
      if (store) writeOpenKeys(next, store);
      return next;
    });
  }, [knownSig]);

  useEffect(() => {
    if (isHostPath(loc.pathname)) return;
    const key = cellKeyForPath(cells, loc.pathname);
    if (!key) return;
    setOpenKeys((keys) => {
      const next = rememberOpen(keys, key);
      if (next === keys) return keys;
      const store = sessionStore();
      if (store) writeOpenKeys(next, store);
      return next;
    });
  }, [cells, loc.pathname]);

  const visibleCells = useMemo(
    () => openKeys.map((key) => cells.find((cell) => cell.key === key)).filter((cell): cell is CellLink => Boolean(cell)),
    [cells, openKeys],
  );

  const value = useMemo<OpenPagesValue>(
    () => ({
      openKeys,
      visibleCells,
      closeCell(key: string) {
        setOpenKeys((keys) => {
          const next = forgetOpen(keys, key);
          const store = sessionStore();
          if (store) writeOpenKeys(next, store);
          return next;
        });
        if (cellKeyForPath(cells, loc.pathname) === key) nav("/");
      },
    }),
    [cells, loc.pathname, nav, openKeys, visibleCells],
  );

  return <OpenPagesContext.Provider value={value}>{children}</OpenPagesContext.Provider>;
}

export function useOpenPages(): OpenPagesValue {
  const value = useContext(OpenPagesContext);
  if (!value) throw new Error("OpenPagesProvider missing");
  return value;
}
