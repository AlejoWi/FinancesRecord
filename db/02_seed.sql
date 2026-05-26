-- FinancesRecord — Seed data
-- Run AFTER 01_schema.sql

INSERT INTO categories (id, name) VALUES
  (1, 'Vivienda'),
  (2, 'Ocio'),
  (3, 'Transporte'),
  (4, 'Alimentación')
ON CONFLICT (id) DO NOTHING;

-- Keep the SERIAL sequence aligned with seeded ids
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
