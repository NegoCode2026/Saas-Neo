-- Turnos de caja: quién abrió, fondo inicial y arqueo por turno.
CREATE TYPE "EstadoTurno" AS ENUM ('ABIERTO', 'CERRADO');

CREATE TABLE "TurnoCaja" (
  "id" TEXT NOT NULL,
  "negocioId" TEXT NOT NULL,
  "estado" "EstadoTurno" NOT NULL DEFAULT 'ABIERTO',
  "fondoInicial" INTEGER NOT NULL DEFAULT 0,
  "abiertoPorId" TEXT,
  "cerradoPorId" TEXT,
  "abiertoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cerradoAt" TIMESTAMP(3),

  CONSTRAINT "TurnoCaja_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TurnoCaja_negocioId_estado_idx" ON "TurnoCaja"("negocioId", "estado");

ALTER TABLE "TurnoCaja" ADD CONSTRAINT "TurnoCaja_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TurnoCaja" ADD CONSTRAINT "TurnoCaja_abiertoPorId_fkey"
  FOREIGN KEY ("abiertoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TurnoCaja" ADD CONSTRAINT "TurnoCaja_cerradoPorId_fkey"
  FOREIGN KEY ("cerradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CierreCaja" ADD COLUMN "turnoId" TEXT;
ALTER TABLE "CierreCaja" ADD CONSTRAINT "CierreCaja_turnoId_fkey"
  FOREIGN KEY ("turnoId") REFERENCES "TurnoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
