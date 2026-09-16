-- Fecha de agregado del producto: por defecto, la actual.
ALTER TABLE "Producto" ADD COLUMN "fechaAgregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
