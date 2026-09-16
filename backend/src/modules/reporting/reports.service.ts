import { prisma } from "../../config/prisma-client.js";

// GET /reportes/resumen — protegido, todo filtrado por negocioId del JWT.
// Ventana: últimos 30 días (coincide con "Ventas Mes" del dashboard).
export async function getDashboardSummary(negocioId: string) {
  const desde = new Date(Date.now() - 30 * 86400000);
  const productos = await prisma.producto.findMany({ where: { negocioId, activo: true } });
  const ventas = await prisma.venta.findMany({
    where: { negocioId, createdAt: { gte: desde } },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { items: { include: { producto: true } } },
  });
  const gastos = await prisma.gasto.findMany({
    where: { negocioId, fecha: { gte: desde } },
    select: { monto: true },
  });
  const valorInventario = productos.reduce((acc, p) => acc + p.precioCompra * p.stockActual, 0);
  const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);
  // Ganancia estimada: suma(precioVenta - precioCompra) de items vendidos,
  // menos descuentos de promociones y menos gastos del negocio = ganancia real.
  let ganancia = 0;
  for (const v of ventas) {
    for (const it of v.items) {
      ganancia += (it.precioUnit - (it.producto?.precioCompra ?? 0)) * it.cantidad;
    }
    ganancia -= v.descuento ?? 0;
  }
  const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
  const bajoStock = productos.filter((p) => p.stockActual <= p.stockMinimo).length;
  return {
    totalProductos: productos.length,
    valorInventario,
    totalVentas,
    gananciaEstimada: ganancia,
    totalGastos,
    gananciaReal: ganancia - totalGastos,
    bajoStock,
    ultimasVentas: ventas.slice(0, 10),
  };
}

// GET /reportes/ventas.csv?desde=&hasta= — una fila por ítem vendido
export async function listVentasCsvRows(negocioId: string, desde?: string, hasta?: string): Promise<unknown[][]> {
  const ventas = await prisma.venta.findMany({
    where: {
      negocioId,
      ...(desde || hasta
        ? { createdAt: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 5000,
    include: { items: { include: { producto: { select: { nombre: true } } } }, creadoPor: { select: { nombre: true } } },
  });
  const rows: unknown[][] = [];
  for (const v of ventas) {
    for (const it of v.items) {
      rows.push([
        v.createdAt.toISOString(),
        v.id,
        it.producto?.nombre ?? "(eliminado)",
        it.cantidad,
        (it.precioUnit / 100).toFixed(2),
        ((it.precioUnit * it.cantidad) / 100).toFixed(2),
        v.creadoPor?.nombre ?? "",
      ]);
    }
  }
  return rows;
}

// GET /reportes/inventario.csv — foto del stock con valorización
export async function listInventarioCsvRows(negocioId: string): Promise<unknown[][]> {
  const productos = await prisma.producto.findMany({
    where: { negocioId, activo: true },
    orderBy: { nombre: "asc" },
    take: 5000,
  });
  return productos.map((p) => [
    p.nombre,
    p.categoria ?? "",
    p.codigoBarras ?? "",
    p.stockActual,
    p.stockMinimo,
    (p.precioCompra / 100).toFixed(2),
    (p.precioVenta / 100).toFixed(2),
    ((p.precioCompra * p.stockActual) / 100).toFixed(2),
  ]);
}

// GET /reportes/gastos.csv?desde=&hasta= — egresos para el contador
export async function listGastosCsvRows(negocioId: string, desde?: string, hasta?: string): Promise<unknown[][]> {
  const gastos = await prisma.gasto.findMany({
    where: {
      negocioId,
      ...(desde || hasta
        ? { fecha: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) } }
        : {}),
    },
    orderBy: { fecha: "asc" },
    take: 5000,
    include: { creadoPor: { select: { nombre: true } } },
  });
  return gastos.map((g) => [
    g.fecha.toISOString(),
    g.concepto,
    g.categoria ?? "",
    (g.monto / 100).toFixed(2),
    g.creadoPor?.nombre ?? "",
  ]);
}

// GET /reportes/caja.csv — historial de arqueos con diferencias
export async function listCierresCsvRows(negocioId: string): Promise<unknown[][]> {
  const cierres = await prisma.cierreCaja.findMany({
    where: { negocioId },
    orderBy: { createdAt: "asc" },
    take: 5000,
    include: { creadoPor: { select: { nombre: true } } },
  });
  return cierres.map((c) => [
    c.createdAt.toISOString(),
    (c.esperado / 100).toFixed(2),
    (c.contado / 100).toFixed(2),
    (c.diferencia / 100).toFixed(2),
    c.ventas,
    c.notas ?? "",
    c.creadoPor?.nombre ?? "",
  ]);
}
