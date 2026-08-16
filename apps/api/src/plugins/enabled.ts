export function seedIds(available: string[], stored: string[]): string[] {
  return stored.length === 0 ? [...available] : [...stored];
}

export function resolveLive(available: string[], stored: string[]): string[] {
  const on = new Set(stored);
  return available.filter((id) => on.has(id));
}

export function canToggle(available: string[], id: string): boolean {
  return available.includes(id);
}
