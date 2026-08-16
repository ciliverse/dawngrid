import { cn } from "../lib/utils";

export function Mark({ className, lit = true }: { className?: string; lit?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-4 shrink-0 grid-cols-2 grid-rows-2 gap-px", className)}
    >
      <span className="bg-current opacity-25" />
      <span className="bg-current opacity-25" />
      <span className="bg-current opacity-25" />
      <span className={lit ? "bg-primary" : "bg-current opacity-25"} />
    </span>
  );
}
