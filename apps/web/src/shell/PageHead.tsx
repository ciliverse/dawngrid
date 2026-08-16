export function PageHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {hint ? <p className="mt-2 max-w-[55ch] text-sm text-muted-foreground">{hint}</p> : null}
    </header>
  );
}
