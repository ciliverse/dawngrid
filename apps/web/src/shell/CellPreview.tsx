import { useState } from "react";
import { cn } from "../lib/utils";
import { Mark } from "./Mark";

type PreviewMode = "shot" | "live" | "none";

function parseHref(href?: string): URL | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function previewMode(href?: string): PreviewMode {
  const url = parseHref(href);
  if (!url) return "none";
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local")) {
    return "live";
  }
  return "shot";
}

function shotSrc(href: string): string {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(href)}?w=960`;
}

function faviconSrc(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

export function CellPreview({
  name,
  href,
  featured = false,
  live = true,
}: {
  name: string;
  href?: string;
  featured?: boolean;
  live?: boolean;
}) {
  const url = parseHref(href);
  const mode = previewMode(href);
  const [shotFailed, setShotFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const showShot = mode === "shot" && href && !shotFailed;
  const showLive = live && mode === "live" && href;
  const showIcon = Boolean(url && !iconFailed);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/40">
      {showShot ? (
        <img
          src={shotSrc(href)}
          alt=""
          className="size-full object-cover object-top"
          onError={() => setShotFailed(true)}
        />
      ) : null}
      {showLive ? (
        <iframe
          title={`${name} preview`}
          src={href}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{ width: "400%", height: "400%", transform: "scale(0.25)" }}
          sandbox="allow-scripts allow-same-origin"
        />
      ) : null}
      {!showShot && !showLive ? (
        <div
          className={cn(
            "flex size-full px-4",
            featured ? "flex-col items-center justify-center gap-4 pb-16" : "items-end justify-between pb-3",
          )}
        >
          <span className={cn("font-mono font-semibold text-primary/80", featured ? "text-7xl" : "text-3xl")}>
            {name.slice(0, 1).toUpperCase()}
          </span>
          <Mark className={cn("text-foreground/20", featured ? "size-12" : "size-10")} />
        </div>
      ) : null}
      {showIcon && url ? (
        <img
          src={faviconSrc(url.hostname)}
          alt=""
          className="absolute bottom-2.5 left-2.5 size-8 rounded-md border border-border bg-background object-contain p-1"
          onError={() => setIconFailed(true)}
        />
      ) : null}
    </div>
  );
}
