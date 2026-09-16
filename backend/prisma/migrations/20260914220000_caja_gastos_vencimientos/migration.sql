-- Vencimientos, método de pago, cierres de caja y gastos.
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'NEQUI', 'TARJETA', 'TRANSFERENCIA');

ALTER TABLE "Producto" ADD COLUMN "fechaVencimiento" TIMESTAMP(3);
ALTER TABLE "Venta" ADD COLUMN "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO';

CREATE TABLE "CierreCaja" (
  "id" TEXT NOT NULL,
  "negocioId" TEXT NOT NULL,
  "esperado" INTEGER NOT NULL,
  "contado" INTEGER NOT NULL,
  "diferencia" INTEGER NOT NULL,
  "ventas" INTEGER NOT NULL,
  "notas" TEXT,
  "creadoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CierreCaja_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CierreCaja_negocioId_createdAt_idx" ON "CierreCaja"("negocioId", "createdAt");

CREATE TABLE "Gasto" (
  "id" TEXT NOT NULL,
  "negocioId" TEXT NOT NULL,
  "concepto" TEXT NOT NULL,
  "categoria" TEXT,
  "monto" INTEGER NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Gasto_negocioId_fecha_idx" ON "Gasto"("negocioId", "fecha");

ALTER TABLE "CierreCaja" ADD CONSTRAINT "CierreCaja_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CierreCaja" ADD CONSTRAINT "CierreCaja_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
