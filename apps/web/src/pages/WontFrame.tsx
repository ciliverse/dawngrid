import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { gsap, prefersReducedMotion, useGSAP } from "../shell/gsap";
import { TechFloor } from "../shell/TechFloor";

function hostOf(src: string): string {
  try {
    return new URL(src).host;
  } catch {
    return src;
  }
}

export function WontFrame({
  name,
  src,
  pending,
}: {
  name: string;
  src: string;
  pending: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const host = hostOf(src);

  useGSAP(
    () => {
      if (!root.current || prefersReducedMotion()) return;
      const copy = root.current.querySelectorAll("[data-wont-copy]");
      const ghost = root.current.querySelector("[data-wont-ghost]");
      gsap.fromTo(
        copy,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" },
      );
      if (!ghost) return;
      gsap.fromTo(
        ghost,
        { autoAlpha: 0, y: 22, rotateY: -18, rotateX: 6, z: -80 },
        {
          autoAlpha: 1,
          y: 0,
          rotateY: -8,
          rotateX: 2,
          z: 0,
          duration: 0.7,
          ease: "power3.out",
          onComplete: () => {
            if (pending) return;
            gsap.to(ghost, {
              rotateY: -4,
              z: 12,
              duration: 3.4,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut",
            });
          },
        },
      );
    },
    { scope: root, dependencies: [pending, name, src] },
  );

  return (
    <div ref={root} className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <TechFloor />
      <div className="relative z-10 mx-auto grid h-full w-full max-w-6xl min-h-0 grid-cols-1 items-center gap-8 px-6 py-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-10 md:px-8">
        <div className="min-w-0">
          <p data-wont-copy className="font-mono text-[11px] text-primary">
            {pending ? "checking" : "won't frame"}
          </p>
          <h1 data-wont-copy className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            {name}
          </h1>
          <p data-wont-copy className="mt-2 max-w-[42ch] text-sm text-muted-foreground">
            {pending
              ? "This bay is empty until the page allows a frame. Open it in a new tab in the meantime."
              : "This site refuses to sit inside Dawngrid. The address stays on this cell. Open it in a new tab."}
          </p>
          <p
            data-wont-copy
            className="mt-4 truncate font-mono text-xs text-muted-foreground"
            title={src}
          >
            {src}
          </p>
          <div data-wont-copy className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <a href={src} target="_blank" rel="noreferrer">
                Open in a new tab
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/admin/cells">Cells</Link>
            </Button>
          </div>
        </div>
        <div className="wont-stage h-44 min-h-0 md:h-[min(62vh,28rem)]">
          <div
            data-wont-ghost
            className="bay-stage wont-ghost relative flex h-full min-h-0 flex-col"
            aria-hidden
          >
            <span className="bay-frame pointer-events-none absolute inset-0" />
            <div className="wont-ghost-chrome">
              <span className="wont-ghost-host">{host}</span>
              <span className="wont-ghost-mark">{pending ? "checking" : "refused"}</span>
            </div>
            <div className="wont-ghost-body">
              <span className="wont-ghost-void" />
              <span className="wont-ghost-scan" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
