-- Idempotencia de gastos: reintentos offline sin duplicar.
ALTER TABLE "Gasto" ADD COLUMN "idempotenciaKey" TEXT;
CREATE UNIQUE INDEX "Gasto_negocioId_idempotenciaKey_key" ON "Gasto"("negocioId", "idempotenciaKey");
