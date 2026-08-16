import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type ChromeStyle,
  type FloorStyle,
  type IslandEdge,
  readDock,
  writeChromeStyle,
  writeFloorStyle,
  writeIslandEdge,
} from "./dock";

type DockContextValue = {
  edge: IslandEdge;
  style: ChromeStyle;
  floor: FloorStyle;
  setEdge: (edge: IslandEdge) => void;
  setStyle: (style: ChromeStyle) => void;
  setFloor: (floor: FloorStyle) => void;
};

const DockContext = createContext<DockContextValue | null>(null);

export function DockProvider({ children }: { children: ReactNode }) {
  const initial = readDock();
  const [edge, setEdgeState] = useState<IslandEdge>(initial.edge);
  const [style, setStyleState] = useState<ChromeStyle>(initial.style);
  const [floor, setFloorState] = useState<FloorStyle>(initial.floor);

  const value = useMemo<DockContextValue>(
    () => ({
      edge,
      style,
      floor,
      setEdge(next) {
        writeIslandEdge(next);
        setEdgeState(next);
      },
      setStyle(next) {
        writeChromeStyle(next);
        setStyleState(next);
      },
      setFloor(next) {
        writeFloorStyle(next);
        setFloorState(next);
      },
    }),
    [edge, style, floor],
  );

  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useDock(): DockContextValue {
  const value = useContext(DockContext);
  if (!value) throw new Error("DockProvider missing");
  return value;
}
