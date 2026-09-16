-- Búsqueda rápida por nombre: el POS hace ILIKE '%...%' y con 2.000 SKUs
-- un seq scan se siente. pg_trgm acelera ese patrón exacto.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Producto_nombre_trgm_idx" ON "Producto" USING gin ("nombre" gin_trgm_ops);
