-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Venta_negocioId_idempotencyKey_key" ON "Venta"("negocioId", "idempotencyKey");
