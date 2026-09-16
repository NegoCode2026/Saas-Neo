-- Pedidos a proveedores: del borrador al ingreso a stock.
CREATE TYPE "EstadoPedido" AS ENUM ('BORRADOR', 'ENVIADO', 'RECIBIDO', 'CANCELADO');

CREATE TABLE "Pedido" (
  "id" TEXT NOT NULL,
  "negocioId" TEXT NOT NULL,
  "proveedorId" TEXT NOT NULL,
  "estado" "EstadoPedido" NOT NULL DEFAULT 'BORRADOR',
  "creadoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recibidoAt" TIMESTAMP(3),

  CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PedidoItem" (
  "id" TEXT NOT NULL,
  "pedidoId" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "cantidad" INTEGER NOT NULL,

  CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Pedido_negocioId_estado_idx" ON "Pedido"("negocioId", "estado");
CREATE INDEX "PedidoItem_pedidoId_idx" ON "PedidoItem"("pedidoId");

ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_proveedorId_fkey"
  FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
