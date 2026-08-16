import { useEffect, useRef, type RefObject } from "react";
import { shouldAcceptWheel, shouldIgnoreFloorWheel, stepFocus, WHEEL_GAP_MS } from "./floor-wheel";

export function useFloorWheel({
  keys,
  focused,
  onFocus,
  enabled,
  root,
}: {
  keys: string[];
  focused: string | null;
  onFocus: (key: string) => void;
  enabled: boolean;
  root: RefObject<HTMLElement | null>;
}) {
  const lastAt = useRef(0);
  const keysSig = keys.join("\0");

  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    const list = keysSig ? keysSig.split("\0") : [];

    function onWheel(event: WheelEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && shouldIgnoreFloorWheel(target)) return;
      if (event.deltaY === 0) return;
      event.preventDefault();
      const now = Date.now();
      if (!shouldAcceptWheel(now, lastAt.current, WHEEL_GAP_MS)) return;
      const next = stepFocus(list, focused, event.deltaY > 0 ? 1 : -1);
      if (!next || next === focused) return;
      lastAt.current = now;
      onFocus(next);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, focused, keysSig, onFocus, root]);
}
