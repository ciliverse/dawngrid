import { FloorControl, PlaceControl, StyleControl, ThemeControl } from "../shell/DockControls";
import { useDock } from "../shell/dock-context";
import { PageHead } from "../shell/PageHead";

export function LayoutPage() {
  const { edge, style, floor, setEdge, setStyle, setFloor } = useDock();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <PageHead title="Layout" hint="Park the chrome, pick its thickness, then choose how the home floor sits." />

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Place</h2>
        <p className="max-w-[48ch] text-sm text-muted-foreground">
          The host chrome sits on one side of the screen. The page starts after it, so nothing is covered.
        </p>
        <PlaceControl edge={edge} onEdge={setEdge} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Chrome</h2>
        <p className="max-w-[48ch] text-sm text-muted-foreground">
          Island floats. Bar fills the edge. Rail keeps icons only.
        </p>
        <StyleControl style={style} onStyle={setStyle} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Theme</h2>
        <p className="max-w-[48ch] text-sm text-muted-foreground">
          Palette first, then light or dark. Same control as the island. Stays on this browser.
        </p>
        <ThemeControl />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Floor</h2>
        <p className="max-w-[48ch] text-sm text-muted-foreground">
          How the first screen arranges live cells. Change it here, then go back to the grid.
        </p>
        <FloorControl floor={floor} onFloor={setFloor} />
      </section>
    </div>
  );
}
