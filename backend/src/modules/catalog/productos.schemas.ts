import { z } from "zod";

// Fecha de vencimiento: el input date manda "AAAA-MM-DD"; "" o null = sin fecha.
export const fechaVencimientoSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)").nullable().optional()
);

// Fecha de agregado: opcional; si no viene (o viene ""), la base pone la actual.
export const fechaAgregadoSchema = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)").optional()
);

export const createSchema = z.object({
  nombre: z.string().min(1).max(120),
  categoria: z.string().max(60).optional(),
  codigoBarras: z.string().max(40).optional(),
  fechaVencimiento: fechaVencimientoSchema,
  fechaAgregado: fechaAgregadoSchema,
  precioCompra: z.number().int().min(0), // centavos
  precioVenta: z.number().int().min(0),
  stockActual: z.number().int().min(0).default(0),
  stockMinimo: z.number().int().min(0).default(5),
});

export const listQuery = z.object({
  search: z.string().max(120).default(""),
  categoria: z.string().max(60).default(""),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// stockActual NUNCA se edita directo: solo se mueve por ventas y movimientos (trazabilidad).
export const updateSchema = createSchema.partial().omit({ stockActual: true });
