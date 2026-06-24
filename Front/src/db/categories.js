/**
 * Category catalog. Mirrors the seed data in /db/02_seed.sql.
 */
export const CATEGORIES = [
  { id: 1, name: 'Vivienda' },
  { id: 2, name: 'Ocio' },
  { id: 3, name: 'Transporte' },
  { id: 4, name: 'Alimentación' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function categoryName(id) {
  return CATEGORY_BY_ID[id]?.name ?? 'Desconocida';
}
