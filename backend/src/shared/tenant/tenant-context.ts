import { AsyncLocalStorage } from "node:async_hooks";

/* Tenant context via AsyncLocalStorage.

   The current negocioId is stored per async execution context (per request).
   The Prisma extension in config/prisma-client.ts reads it and injects the
   tenant filter automatically, so a handler can't accidentally query another
   business' data. Set once by the auth middleware; never trust the client. */

const storage = new AsyncLocalStorage<string>();

export function runWithTenant<T>(negocioId: string, fn: () => T): T {
  return storage.run(negocioId, fn);
}

export function getTenantId(): string | undefined {
  return storage.getStore();
}
