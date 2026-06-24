// Deterministic color picker for category badges / chart slices.
// Same input -> same output, so a category keeps its color across
// sessions and pages (dashboard pie + expenses table stay coherent).

const PALETTE = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#f43f5e', // rose
];

export function categoryColor(name) {
  const key = String(name ?? '').trim();
  if (!key) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}