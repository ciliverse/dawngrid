export type IslandEdge = "top" | "right" | "bottom" | "left";
export type ChromeStyle = "island" | "bar" | "rail";
export type FloorStyle = "stage" | "constellation" | "rack" | "mosaic" | "approach" | "leap" | "deck";

export type DockPrefs = {
  edge: IslandEdge;
  style: ChromeStyle;
  floor: FloorStyle;
};

const EDGE_KEY = "dawngrid.island.edge";
const STYLE_KEY = "dawngrid.chrome.style";
const FLOOR_KEY = "dawngrid.floor.style";
const EDGES: IslandEdge[] = ["top", "right", "bottom", "left"];
const STYLES: ChromeStyle[] = ["island", "bar", "rail"];
const FLOORS: FloorStyle[] = ["stage", "constellation", "rack", "mosaic", "approach", "leap", "deck"];

export const CHROME_STYLES: Array<{ id: ChromeStyle; label: string; hint: string }> = [
  { id: "island", label: "Island", hint: "A floating capsule that sits off the edge." },
  { id: "bar", label: "Bar", hint: "A full strip along one side, like a tool bar." },
  { id: "rail", label: "Rail", hint: "Icons only. Names appear when you hover." },
];

export const FLOOR_STYLES: Array<{ id: FloorStyle; label: string; hint: string }> = [
  { id: "stage", label: "Stage", hint: "One lit bay. The rest sit on a strip." },
  { id: "constellation", label: "Constellation", hint: "Pads on the lattice, joined by copper traces." },
  { id: "rack", label: "Rack", hint: "A live room on the left. Thin bays on the right." },
  { id: "mosaic", label: "Mosaic", hint: "Rooms sized by kind. No two tiles match." },
  { id: "approach", label: "Approach", hint: "Pick from the left. The bay walks up to you." },
  { id: "leap", label: "Leap", hint: "The row you pick flies into the bay." },
  { id: "deck", label: "Deck", hint: "A stack in the middle. The list only turns the card." },
];

export function readDock(): DockPrefs {
  return { edge: readIslandEdge(), style: readChromeStyle(), floor: readFloorStyle() };
}

export function readIslandEdge(): IslandEdge {
  try {
    const value = localStorage.getItem(EDGE_KEY);
    if (value && EDGES.includes(value as IslandEdge)) return value as IslandEdge;
  } catch {
    /* ignore */
  }
  return "top";
}

export function readChromeStyle(): ChromeStyle {
  try {
    const value = localStorage.getItem(STYLE_KEY);
    if (value && STYLES.includes(value as ChromeStyle)) return value as ChromeStyle;
  } catch {
    /* ignore */
  }
  return "island";
}

export function writeIslandEdge(edge: IslandEdge) {
  localStorage.setItem(EDGE_KEY, edge);
}

export function writeChromeStyle(style: ChromeStyle) {
  localStorage.setItem(STYLE_KEY, style);
}

export function readFloorStyle(): FloorStyle {
  try {
    const value = localStorage.getItem(FLOOR_KEY);
    if (value && FLOORS.includes(value as FloorStyle)) return value as FloorStyle;
  } catch {
    /* ignore */
  }
  return "stage";
}

export function writeFloorStyle(style: FloorStyle) {
  localStorage.setItem(FLOOR_KEY, style);
}
