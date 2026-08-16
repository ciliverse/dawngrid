export type FrameStatus = "ok" | "blocked" | "unknown";

export function embedIsEmptyBay(input: {
  status?: FrameStatus;
  pending: boolean;
  failed: boolean;
}): boolean {
  if (input.pending || input.failed) return true;
  return input.status !== "ok";
}
