-- Migración 86 — Categoría «Embutidos» para los alimentos.
--
-- Se AGREGA al final del enum: sus valores solo se agregan (docs/CATALOGO-BASE.md,
-- «Categorías»). El orden en que se ofrecen en pantalla lo da
-- `CATEGORIAS_ALIMENTO` en el dominio, no el orden del enum.

ALTER TYPE "CategoriaAlimento" ADD VALUE 'EMBUTIDOS';
