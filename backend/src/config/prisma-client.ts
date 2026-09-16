import { Prisma, PrismaClient } from "@prisma/client";
import { getTenantId } from "../shared/tenant/tenant-context.js";

/* Prisma client with automatic multi-tenant scoping.

   Every authenticated request runs inside a tenant context (see
   shared/middleware/require-auth.ts + shared/tenant/tenant-context.ts).
   For the models below — the ones that own a `negocioId` column — this
   extension injects the tenant id into `where` (reads/writes) and `data`
   (creates), so a handler can't accidentally read or mutate another
   business' rows even if it forgets the filter. Explicit `negocioId` in the
   code is harmless: the tenant value always wins.

   `Negocio` itself is NOT scoped (its own id is the tenant), and public
   routes (login/register/forgot/reset) run without a tenant context, so
   their cross-tenant lookups keep working. */

const TENANT_SCOPED_MODELS = new Set<string>([
  "Usuario",
  "Producto",
  "Movimiento",
  "Venta",
  "Proveedor",
  "Pedido",
  "CierreCaja",
  "TurnoCaja",
  "Gasto",
]);

const WHERE_OPS = new Set<string>([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "update",
  "delete",
]);

const base = new PrismaClient();

export const prisma = base.$extends({
  name: "tenant-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = getTenantId();
        if (!tenantId || !TENANT_SCOPED_MODELS.has(model)) return query(args);

        const a = args as Record<string, any>;

        if (WHERE_OPS.has(operation)) {
          a.where = { ...(a.where ?? {}), negocioId: tenantId };
        } else if (operation === "create") {
          a.data = { ...(a.data ?? {}), negocioId: tenantId };
        } else if (operation === "createMany") {
          const data = a.data;
          a.data = Array.isArray(data)
            ? data.map((d: Record<string, unknown>) => ({ ...d, negocioId: tenantId }))
            : { ...(data ?? {}), negocioId: tenantId };
        } else if (operation === "upsert") {
          a.where = { ...(a.where ?? {}), negocioId: tenantId };
          a.create = { ...(a.create ?? {}), negocioId: tenantId };
        }

        return query(args);
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
export { Prisma };
