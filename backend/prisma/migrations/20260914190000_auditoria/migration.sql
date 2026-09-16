-- Auditoría: quién registró cada movimiento y cada venta.
-- Nullable + SetNull: si se borra un usuario, el rastro queda con autor vacío.
ALTER TABLE "Movimiento" ADD COLUMN "creadoPorId" TEXT;
ALTER TABLE "Venta" ADD COLUMN "creadoPorId" TEXT;

ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Movimiento_creadoPorId_idx" ON "Movimiento"("creadoPorId");
CREATE INDEX "Venta_creadoPorId_idx" ON "Venta"("creadoPorId");
