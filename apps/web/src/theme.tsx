import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";
export type PaletteId = "dawn" | "ion" | "tide";

export const PALETTES: Array<{ id: PaletteId; label: string; hint: string }> = [
  { id: "dawn", label: "Dawn", hint: "Warm stone and copper." },
  { id: "ion", label: "Ion", hint: "Electric cyan on night slate." },
  { id: "tide", label: "Tide", hint: "Sea green on cool grey." },
];

const MODE_KEY = "dawngrid.theme";
const PALETTE_KEY = "dawngrid.palette";

type ThemeCtx = {
  mode: ThemeMode;
  palette: PaletteId;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: PaletteId) => void;
  toggleMode: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function readPalette(value: string | null | undefined): PaletteId {
  if (value === "ink" || value === "ion") return "ion";
  if (value === "tide" || value === "dawn") return value;
  return "dawn";
}

export function readMode(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

function storedPalette(): PaletteId {
  try {
    return readPalette(localStorage.getItem(PALETTE_KEY));
  } catch {
    return "dawn";
  }
}

function storedMode(): ThemeMode {
  try {
    return readMode(localStorage.getItem(MODE_KEY));
  } catch {
    return "light";
  }
}

export function applyTheme(mode: ThemeMode, palette: PaletteId) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.palette = palette;
  root.style.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(storedMode);
  const [palette, setPalette] = useState<PaletteId>(storedPalette);

  useLayoutEffect(() => {
    applyTheme(mode, palette);
    try {
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(PALETTE_KEY, palette);
    } catch {
      /* ignore */
    }
  }, [mode, palette]);

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      palette,
      setMode,
      setPalette,
      toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode, palette],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("ThemeProvider missing");
  return ctx;
}
