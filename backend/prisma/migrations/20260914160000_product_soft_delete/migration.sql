-- AlterTable
ALTER TABLE "Producto" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- DropIndex
DROP INDEX "Producto_negocioId_idx";

-- CreateIndex
CREATE INDEX "Producto_negocioId_activo_idx" ON "Producto"("negocioId", "activo");
