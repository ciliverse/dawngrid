import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useOpenOnEnter(to: string | null) {
  const nav = useNavigate();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || !to) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      }
      nav(to);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [nav, to]);
}
