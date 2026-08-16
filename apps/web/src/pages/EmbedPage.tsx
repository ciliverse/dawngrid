import { useQuery } from "@tanstack/react-query";
import { api, type EmbedCell } from "../api";
import { useSession } from "../session";
import { embedIsEmptyBay, type FrameStatus } from "./embed-view";
import { WontFrame } from "./WontFrame";

function safeSrc(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function EmbedPage({ cell }: { cell: EmbedCell }) {
  const { token } = useSession();
  const src = safeSrc(cell.href);
  const frame = useQuery({
    queryKey: ["embed-frame", cell.id],
    enabled: Boolean(token && src),
    queryFn: () => api<{ status: FrameStatus }>(`/api/embeds/${cell.id}/frame`, { token }),
    staleTime: 60_000,
    retry: false,
  });
  if (!src) {
    return <div className="p-6 text-sm text-destructive">Embed URL is not http(s).</div>;
  }
  if (embedIsEmptyBay({ pending: frame.isPending, failed: frame.isError, status: frame.data?.status })) {
    return <WontFrame name={cell.name} src={src} pending={frame.isPending} />;
  }
  return (
    <iframe
      title={cell.name}
      src={src}
      className="absolute inset-0 size-full border-0 bg-background"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}
