import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { createSchema, listQuery, updateSchema } from "./productos.schemas.js";

export const productosRouter = Router();
productosRouter.use(authMiddleware);

/* Código de barras: un solo producto activo por negocio. Se valida en el
   servidor (no solo en el cliente) porque el look-up difuso puede dejar pasar
   duplicados y un código repetido rompe el escaneo del POS. `excluirId` permite
   que el propio producto conserve su código al editarse. */
async function productoConCodigo(
  negocioId: string,
  codigo: string | undefined,
  excluirId?: string
): Promise<{ id: string; nombre: string } | null> {
  const limpio = codigo?.trim();
  if (!limpio) return null;
  return prisma.producto.findFirst({
    where: {
      negocioId,
      activo: true,
      codigoBarras: limpio,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { id: true, nombre: true },
  });
}

// GET /productos?search=&categoria=&limit=&offset= — siempre filtrado por negocioId y activos.
// Busca por nombre (parcial, con índice trigram) o código de barras. Total en X-Total-Count.
productosRouter.get("/", async (req: AuthRequest, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { search, categoria, limit, offset } = parsed.data;

  const where = {
    negocioId: req.negocioId!,
    activo: true,
    ...(categoria ? { categoria } : {}),
    ...(search
      ? {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { codigoBarras: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.producto.findMany({ where, orderBy: { updatedAt: "desc" }, take: limit, skip: offset }),
    prisma.producto.count({ where }),
  ]);
  res.set("X-Total-Count", String(total));
  res.json(items);
});

// GET /productos/catalogo — lista liviana y completa de activos, para el caché
// offline del POS (declarada antes que cualquier /:id).
productosRouter.get("/catalogo", async (req: AuthRequest, res) => {
  const items = await prisma.producto.findMany({
    where: { negocioId: req.negocioId!, activo: true },
    select: { id: true, nombre: true, precioVenta: true, stockActual: true, codigoBarras: true },
    orderBy: { nombre: "asc" },
    take: 3000,
  });
  res.json(items);
});

// GET /productos/por-codigo?codigo=&excluir= — búsqueda EXACTA del código de
// barras dentro del negocio (detección confiable de duplicados). Producto o null.
productosRouter.get("/por-codigo", async (req: AuthRequest, res) => {
  const codigo = String(req.query.codigo ?? "").trim();
  if (!codigo) return res.json(null);
  const excluir = String(req.query.excluir ?? "").trim();
  const p = await prisma.producto.findFirst({
    where: {
      negocioId: req.negocioId!,
      activo: true,
      codigoBarras: codigo,
      ...(excluir ? { id: { not: excluir } } : {}),
    },
  });
  res.json(p ?? null);
});

// GET /productos/categorias — distintas categorías activas del negocio
// (para el filtro y el datalist del formulario).
productosRouter.get("/categorias", async (req: AuthRequest, res) => {
  const rows = await prisma.producto.findMany({
    where: { negocioId: req.negocioId!, activo: true, NOT: { categoria: null } },
    select: { categoria: true },
    distinct: ["categoria"],
    orderBy: { categoria: "asc" },
    take: 200,
  });
  res.json(rows.map((r) => r.categoria).filter((c): c is string => !!c?.trim()));
});

// GET /productos/alertas — stockActual <= stockMinimo
productosRouter.get("/alertas", async (req: AuthRequest, res) => {
  const productos = await prisma.producto.findMany({
    where: { negocioId: req.negocioId!, activo: true },
  });
  res.json(productos.filter((p) => p.stockActual <= p.stockMinimo));
});

// GET /productos/mas-vendidos?limite=8&dias=30 — top por unidades vendidas
// en la ventana. Sin configurar nada: los favoritos salen solos de las ventas.
productosRouter.get("/mas-vendidos", async (req: AuthRequest, res) => {
  const negocioId = req.negocioId!;
  const limite = Math.min(24, Math.max(1, Number(req.query.limite) || 8));
  const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 30));
  const desde = new Date(Date.now() - dias * 86400000);

  const ventas = await prisma.venta.findMany({
    where: { negocioId, createdAt: { gte: desde } },
    select: { items: { select: { productoId: true, cantidad: true } } },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const conteo = new Map<string, number>();
  for (const v of ventas) {
    for (const it of v.items) conteo.set(it.productoId, (conteo.get(it.productoId) ?? 0) + it.cantidad);
  }
  const top = [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite);
  if (top.length === 0) return res.json([]);

  const prods = await prisma.producto.findMany({
    where: { id: { in: top.map(([id]) => id) }, negocioId, activo: true },
    select: { id: true, nombre: true, precioVenta: true, stockActual: true, codigoBarras: true },
  });
  const vendidos = new Map(top);
  res.json(
    prods
      .map((p) => ({ ...p, vendidos: vendidos.get(p.id) ?? 0 }))
      .sort((a, b) => b.vendidos - a.vendidos)
  );
});

// GET /productos/estancados?dias=30&limite=100 — stock con plata inmovilizada:
// activos, con unidades y sin ventas en la ventana. Ordenados por valor.
productosRouter.get("/estancados", async (req: AuthRequest, res) => {
  const negocioId = req.negocioId!;
  const dias = Math.min(180, Math.max(7, Number(req.query.dias) || 30));
  const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 100));
  const desde = new Date(Date.now() - dias * 86400000);

  const [productos, ventas] = await Promise.all([
    prisma.producto.findMany({
      where: { negocioId, activo: true, stockActual: { gt: 0 } },
      select: { id: true, nombre: true, stockActual: true, precioCompra: true },
    }),
    prisma.venta.findMany({
      where: { negocioId },
      select: { createdAt: true, items: { select: { productoId: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ]);
  // Una pasada ordenada: marca ventas en ventana y la última venta de cada uno.
  const conVentas = new Set<string>();
  const ultimaVenta = new Map<string, Date>();
  for (const v of ventas) {
    const reciente = v.createdAt >= desde;
    for (const it of v.items) {
      if (reciente) conVentas.add(it.productoId);
      if (!ultimaVenta.has(it.productoId)) ultimaVenta.set(it.productoId, v.createdAt);
    }
  }

  const items = productos
    .filter((p) => !conVentas.has(p.id))
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      stockActual: p.stockActual,
      precioCompra: p.precioCompra,
      valor: p.stockActual * p.precioCompra,
      ultimaVenta: ultimaVenta.get(p.id) ?? null,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);

  res.json({
    dias,
    totalValor: items.reduce((acc, it) => acc + it.valor, 0),
    items,
  });
});

productosRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const dup = await productoConCodigo(req.negocioId!, parsed.data.codigoBarras);
  if (dup) return res.status(409).json({ error: `Ese código ya es de "${dup.nombre}"` });
  const { fechaVencimiento, fechaAgregado, ...resto } = parsed.data;
  const p = await prisma.producto.create({
    data: {
      ...resto,
      ...(fechaVencimiento ? { fechaVencimiento: new Date(`${fechaVencimiento}T00:00:00`) } : {}),
      // Omitida => la base pone la fecha actual.
      ...(fechaAgregado ? { fechaAgregado: new Date(`${fechaAgregado}T00:00:00`) } : {}),
      negocioId: req.negocioId!,
    },
  });
  res.status(201).json(p);
});

// GET /productos/vencimientos?dias=7 — vencidos + próximos (solo perecederos activos)
productosRouter.get("/vencimientos", async (req: AuthRequest, res) => {
  const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 7));
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + dias * 86400000);
  const items = await prisma.producto.findMany({
    where: { negocioId: req.negocioId!, activo: true, fechaVencimiento: { not: null, lte: limite } },
    select: { id: true, nombre: true, stockActual: true, fechaVencimiento: true },
    orderBy: { fechaVencimiento: "asc" },
    take: 200,
  });
  res.json({
    vencidos: items.filter((p) => p.fechaVencimiento! <= ahora),
    proximos: items.filter((p) => p.fechaVencimiento! > ahora),
  });
});

// stockActual NUNCA se edita directo: solo se mueve por ventas y movimientos (trazabilidad).

productosRouter.patch("/:id", async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // findFirst con negocioId: si no es de tu negocio, 404 (no 403, para no filtrar info)
  const existing = await prisma.producto.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId!, activo: true },
  });
  if (!existing) return res.status(404).json({ error: "No encontrado" });
  const dup = await productoConCodigo(req.negocioId!, parsed.data.codigoBarras, existing.id);
  if (dup) return res.status(409).json({ error: `Ese código ya es de "${dup.nombre}"` });
  const { fechaVencimiento, fechaAgregado, ...resto } = parsed.data;
  const updated = await prisma.producto.update({
    where: { id: existing.id },
    data: {
      ...resto,
      ...(fechaVencimiento === null
        ? { fechaVencimiento: null }
        : fechaVencimiento
        ? { fechaVencimiento: new Date(`${fechaVencimiento}T00:00:00`) }
        : {}),
      ...(fechaAgregado ? { fechaAgregado: new Date(`${fechaAgregado}T00:00:00`) } : {}),
    },
  });
  res.json(updated);
});

// DELETE /productos/:id — soft-delete: se desactiva y desaparece de listas,
// pero el historial de ventas/movimientos queda intacto.
productosRouter.delete("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.producto.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId!, activo: true },
  });
  if (!existing) return res.status(404).json({ error: "No encontrado" });
  await prisma.producto.update({ where: { id: existing.id }, data: { activo: false } });
  res.status(204).end();
});
