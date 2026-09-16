"use client";

import { api } from "@/lib/api-client";

/* Offline sales queue in IndexedDB (ex-"offline").
   Each queued sale carries an idempotencyKey: on retry the backend
   recognizes the key instead of duplicating the sale. */

export type ItemVenta = { productoId: string; cantidad: number };

export type VentaPendiente = {
  key: string;
  items: ItemVenta[];
  total: number;
  descuento: number;
  resumen: string;
  createdAt: number;
};

export type ProductoCache = {
  id: string;
  nombre: string;
  precioVenta: number;
  stockActual: number;
  codigoBarras?: string | null;
};

const DB_NAME = "stocklocal";
const STORE_VENTAS = "ventas_pendientes";
const STORE_PRODUCTOS = "productos_cache";

let dbPromise: Promise<IDBDatabase> | null = null;

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_VENTAS)) {
        db.createObjectStore(STORE_VENTAS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_PRODUCTOS)) {
        db.createObjectStore(STORE_PRODUCTOS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function db(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = abrirDB();
  return dbPromise;
}

function unaVez<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const tx = database.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      })
  );
}

export function nuevaKey(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `v-${Date.now()}-${rand}`;
}

export async function encolarVenta(v: Omit<VentaPendiente, "key" | "createdAt">): Promise<VentaPendiente> {
  const pendiente: VentaPendiente = { ...v, key: nuevaKey(), createdAt: Date.now() };
  await unaVez(STORE_VENTAS, "readwrite", (s) => s.put(pendiente));
  return pendiente;
}

export function listarPendientes(): Promise<VentaPendiente[]> {
  return unaVez<VentaPendiente[]>(STORE_VENTAS, "readonly", (s) => s.getAll());
}

export function contarPendientes(): Promise<number> {
  return unaVez<number>(STORE_VENTAS, "readonly", (s) => s.count());
}

export function borrarPendiente(key: string): Promise<void> {
  return unaVez<void>(STORE_VENTAS, "readwrite", (s) => s.delete(key));
}

export async function guardarProductosCache(ps: ProductoCache[]): Promise<void> {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_PRODUCTOS, "readwrite");
    const store = tx.objectStore(STORE_PRODUCTOS);
    store.clear();
    for (const p of ps) store.put(p);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function leerProductosCache(): Promise<ProductoCache[]> {
  return unaVez<ProductoCache[]>(STORE_PRODUCTOS, "readonly", (s) => s.getAll());
}

export type FlushResultado = { enviadas: number; fallidas: number; sinConexion: boolean };

/* Reenvía la cola. Si la red sigue caída corta y vuelve después.
   Una venta con error de negocio (ej. sin stock) queda en cola y se cuenta
   como fallida para que el usuario la revise. */
export async function flushPendientes(): Promise<FlushResultado> {
  const pendientes = await listarPendientes();
  let enviadas = 0;
  let fallidas = 0;
  for (const p of pendientes) {
    try {
      await api("/ventas", {
        method: "POST",
        body: JSON.stringify({
          items: p.items,
          idempotencyKey: p.key,
          ...(p.descuento ? { descuento: p.descuento } : {}),
        }),
      });
      await borrarPendiente(p.key);
      enviadas++;
    } catch (e) {
      if (e instanceof TypeError) return { enviadas, fallidas, sinConexion: true };
      fallidas++;
    }
  }
  return { enviadas, fallidas, sinConexion: false };
}
