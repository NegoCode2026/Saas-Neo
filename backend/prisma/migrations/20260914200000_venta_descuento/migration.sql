-- Promoción: descuento absoluto por venta (centavos).
ALTER TABLE "Venta" ADD COLUMN "descuento" INTEGER NOT NULL DEFAULT 0;
