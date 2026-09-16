"use client";

import { useEffect, useRef, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import { fetchCatalogo, fetchMasVendidos, listarProductos } from "@/features/catalog/api";
import { crearVenta } from "@/features/sales/api";
import {
  encolarVenta,
  guardarProductosCache,
  leerProductosCache,
  contarPendientes,
  flushPendientes,
} from "@/lib/offline-sales-queue";
import { Badge, BtnPrimary, Card, EmptyState, PageHeader, StatusMsg } from "../../components/ui/SharedControls";
import BarcodeCameraScanner from "../../components/sales/BarcodeCameraScanner";
import { toast } from "../../components/ui/ToastNotifications";
import { confirmDialog } from "../../components/ui/ConfirmDialog";

type Producto = { id: string; nombre: string; precioVenta: number; stockActual: number; codigoBarras?: string | null };
type Item = Producto & { cant: number };
type Top = Producto & { vendidos: number };

export default function VenderPage() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanner, setScanner] = useState(false);
  const [descuento, setDescuento] = useState("0");
  const [ultimoScan, setUltimoScan] = useState("");
  const [top, setTop] = useState<Top[]>([]);

  async function buscar(query: string) {
    setBuscando(true);
    try {
      if (!query) {
        // Catálogo completo (liviano) para vender y para el caché offline
        const catalogo = await fetchCatalogo();
        setResultados(catalogo);
        guardarProductosCache(catalogo).catch(() => {});
      } else {
        setResultados((await listarProductos({ search: query })).items);
      }
    } catch {
      // Sin red: buscamos sobre el catálogo guardado
      const cache = await leerProductosCache();
      if (cache.length > 0) {
        const term = query.trim().toLowerCase();
        setResultados(
          term
            ? cache.filter(
                (p) =>
                  p.nombre.toLowerCase().includes(term) ||
                  (p.codigoBarras ?? "").includes(query.trim())
              )
            : cache
        );
        setMsg("Sin conexión: mostrando el catálogo guardado.");
      } else {
        setMsg("Sin conexión y sin catálogo guardado. Reconectate para cargar productos.");
      }
    } finally {
      setBuscando(false);
    }
  }

  // Favoritos: salen solos de lo más vendido (silencioso si no hay).
  async function cargarTop() {
    try {
      setTop(await fetchMasVendidos(8));
    } catch {
      /* offline o sin ventas: se oculta la sección */
    }
  }

  useEffect(() => {
    buscar("");
    cargarTop();

    async function sincronizar() {
      const r = await flushPendientes();
      setPendientes(await contarPendientes());
      if (r.enviadas > 0) {
        toast(`${r.enviadas} venta(s) sincronizada(s).`);
        buscar("");
      }
    }

    const onOnline = () => {
      setOnline(true);
      sincronizar();
    };
    const onOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    contarPendientes().then(setPendientes).catch(() => {});
    // Al abrir, intentamos vaciar lo que haya quedado de una sesión offline
    if (navigator.onLine) sincronizar();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onType(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => buscar(v), 300);
  }

  // Devuelve true si entró a la cuenta (para dar feedback al escanear).
  function agregar(p: Producto): boolean {
    const enCarrito = carrito.find((x) => x.id === p.id)?.cant ?? 0;
    if (enCarrito >= p.stockActual) {
      setMsg(`Solo hay ${p.stockActual} de ${p.nombre}.`);
      return false;
    }
    setMsg("");
    setCarrito((c) => {
      const ex = c.find((x) => x.id === p.id);
      if (ex) return c.map((x) => (x.id === p.id ? { ...x, cant: x.cant + 1 } : x));
      return [...c, { ...p, cant: 1 }];
    });
    return true;
  }

  function cambiarCant(id: string, delta: number) {
    const item = carrito.find((x) => x.id === id);
    if (item && delta > 0 && item.cant >= item.stockActual) {
      setMsg(`Solo hay ${item.stockActual} de ${item.nombre}.`);
      return;
    }
    setCarrito((c) =>
      c.map((x) => (x.id === id ? { ...x, cant: x.cant + delta } : x)).filter((x) => x.cant > 0)
    );
  }

  async function cobrar() {
    if (carrito.length === 0 || cobrando) return;
    setCobrando(true);
    setMsg("Cobrando...");
    const items = carrito.map((c) => ({ productoId: c.id, cantidad: c.cant }));
    const resumen = carrito.map((c) => `${c.nombre} x${c.cant}`).join(", ");
    const totalVenta = carrito.reduce((acc, c) => acc + c.precioVenta * c.cant, 0);
    try {
      await crearVenta({ items, ...(descuentoCent > 0 ? { descuento: descuentoCent } : {}) });
      setMsg("");
      toast(
        descuentoCent > 0
          ? `Venta registrada con ${fmtCOP(descuentoCent)} de descuento.`
          : "Venta registrada, stock descontado."
      );
      setCarrito([]);
      setDescuento("0");
      buscar(q);
      cargarTop();
    } catch (e: unknown) {
      // Sin red: guardamos la venta en la cola local (idempotente al sincronizar)
      if (e instanceof TypeError || !navigator.onLine) {
        await encolarVenta({ items, total: totalVenta, descuento: descuentoCent, resumen });
        setPendientes(await contarPendientes());
        setMsg("");
        toast("Sin conexión: venta guardada. Se envía sola.", "info");
        setCarrito([]);
        setDescuento("0");
        return;
      }
      const message = e instanceof Error ? e.message : "No se pudo cobrar";
      setMsg(`Error: ${message}`);
      // El stock pudo cambiar en otra caja: refrescar para mostrar lo real
      if (/sin stock/i.test(message)) buscar(q);
    } finally {
      setCobrando(false);
    }
  }

  const total = carrito.reduce((acc, c) => acc + c.precioVenta * c.cant, 0);
  const unidades = carrito.reduce((acc, c) => acc + c.cant, 0);
  const descuentoCent = Math.max(0, Math.round(Number(descuento) * 100) || 0);
  const totalFinal = Math.max(0, total - descuentoCent);

  // El código manda: match exacto entra directo a la cuenta.
  function resolverScan(rs: Producto[], code: string) {
    const term = code.trim();
    const exacto = rs.find((p) => (p.codigoBarras ?? "") === term);
    if (exacto) {
      if (agregar(exacto)) {
        setUltimoScan(exacto.nombre);
        toast(`Agregado: ${exacto.nombre}`);
      }
      setQ(term);
      setResultados([exacto]);
      return;
    }
    if (rs.length === 0) {
      ofrecerRegistro(term);
      return;
    }
    setQ(term);
    setResultados(rs);
    setMsg("Varios coinciden: elegí el correcto en la lista.");
  }

  // Código desconocido: atajo para registrarlo sin perder el código.
  async function ofrecerRegistro(code: string) {
    const ir = await confirmDialog({
      titulo: "No encontré ese código",
      mensaje: `Código ${code}. ¿Lo registrás ahora? Se abre Productos con el código listo.`,
      confirmar: "Registrarlo",
      cancelar: "Seguir vendiendo",
    });
    if (!ir) return;
    try {
      sessionStorage.setItem("stocklocal-nuevo-codigo", code);
    } catch {
      /* sin storage, igual navegamos */
    }
    window.location.href = "/productos#registro";
  }

  // Escaneo en modo continuo: el escáner queda abierto para vender varios
  // seguidos. Online busca en el servidor; sin red usa el catálogo guardado.
  async function onScan(code: string) {
    setMsg("");
    try {
      const rs = (await listarProductos({ search: code })).items;
      resolverScan(rs, code);
    } catch {
      const cache = await leerProductosCache().catch(() => []);
      const term = code.trim();
      const exacto = cache.find((p) => (p.codigoBarras ?? "") === term);
      if (exacto) {
        if (agregar(exacto)) {
          setUltimoScan(exacto.nombre);
          toast(`Agregado: ${exacto.nombre}`);
        }
        return;
      }
      setMsg("Sin conexión y ese código no está en el catálogo guardado.");
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Vender" hint="Buscá, tocá + y cobrá. El stock se descuenta solo." />

      {(!online || pendientes > 0) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-sm font-bold ${
            online ? "border-tienda-100 bg-tienda-50 text-tienda-900" : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          <span>
            {online
              ? `${pendientes} venta(s) por sincronizar`
              : `Sin conexión${pendientes > 0 ? ` · ${pendientes} venta(s) guardada(s)` : ""}`}
          </span>
          <button
            type="button"
            onClick={async () => {
              const r = await flushPendientes();
              setPendientes(await contarPendientes());
              setMsg(
                r.enviadas > 0
                  ? `${r.enviadas} venta(s) sincronizada(s).`
                  : r.sinConexion
                    ? "Seguís sin conexión."
                    : r.fallidas > 0
                      ? `${r.fallidas} venta(s) con problema (revisá el stock).`
                      : "Nada para sincronizar."
              );
            }}
            className="press rounded-xl border border-current px-3 py-2"
          >
            Sincronizar
          </button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        {/* Buscador + resultados */}
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscar(q);
            }}
            className="flex gap-2"
            role="search"
          >
            <label htmlFor="pos-search" className="sr-only">
              Buscar producto para vender
            </label>
            <input
              id="pos-search"
              className="flex-1 rounded-xl border border-zinc-300 bg-white p-3.5 text-base placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
              placeholder="¿Qué vendés? Ej. arroz..."
              value={q}
              onChange={(e) => onType(e.target.value)}
              autoComplete="off"
              inputMode="search"
            />
            <button
              type="submit"
              className="press rounded-xl border border-zinc-300 bg-white px-5 font-bold hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
            >
              {buscando ? "..." : "Buscar"}
            </button>
            <button
              type="button"
              onClick={() => setScanner(true)}
              aria-label="Escanear código de barras"
              className="press shrink-0 rounded-xl border border-tienda-700 bg-tienda-50 px-4 font-bold text-tienda-800 hover:bg-tienda-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
            >
              Escanear
            </button>
          </form>

          {q === "" && top.length > 0 && (
            <section aria-label="Los más vendidos">
              <p className="mb-1.5 font-extrabold text-tinta">Los más vendidos</p>
              <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {top.map((p) => {
                  const enCarrito = carrito.find((x) => x.id === p.id)?.cant ?? 0;
                  const alMax = enCarrito >= p.stockActual;
                  return (
                    <li
                      key={p.id}
                      className="flex w-36 shrink-0 flex-col justify-between gap-2 rounded-card border border-tienda-100 bg-tienda-50/50 p-3 shadow-card"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-tinta">{p.nombre}</p>
                        <p className="text-xs tabular-nums text-zinc-600">
                          {fmtCOP(p.precioVenta)} · {p.vendidos} vend.
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Agregar ${p.nombre} a la venta`}
                        onClick={() => agregar(p)}
                        disabled={p.stockActual <= 0 || alMax}
                        className="press rounded-xl bg-tienda-700 py-2.5 text-sm font-extrabold text-white shadow-pop hover:bg-tienda-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
                      >
                        {p.stockActual <= 0 ? "Sin stock" : "Agregar"}3
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {resultados.length === 0 && !buscando ? (
            <EmptyState title="Sin resultados" hint="Probá con otra palabra o agregá el producto en 30 segundos." />
          ) : (
            <ul className="grid gap-2 md:grid-cols-2" aria-live="polite">
              {resultados.slice(0, 30).map((p, i) => {
                const enCarrito = carrito.find((x) => x.id === p.id)?.cant ?? 0;
                const alMax = enCarrito >= p.stockActual;
                return (
                <li
                  key={p.id}
                  className="rise flex items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white p-3 shadow-card"
                  style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-tinta">{p.nombre}</p>
                    <p className="text-sm text-zinc-600">
                      {fmtCOP(p.precioVenta)}
                      {p.stockActual <= 0 ? (
                        <span className="ml-2">
                          <Badge tone="bad">Sin stock</Badge>
                        </span>
                      ) : (
                        <span className="text-zinc-500"> · {p.stockActual} disp.</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      p.stockActual <= 0
                        ? `${p.nombre} sin stock`
                        : alMax
                          ? `Ya tenés el máximo de ${p.nombre} en la cuenta`
                          : `Agregar ${p.nombre} a la venta`
                    }
                    onClick={() => agregar(p)}
                    disabled={p.stockActual <= 0 || alMax}
                    className="press h-12 w-12 shrink-0 rounded-2xl border-2 border-tienda-700 text-2xl font-extrabold text-tienda-800 hover:bg-tienda-50 active:bg-tienda-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
                  >
                    +
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Cuenta: derecha sticky en desktop, abajo en móvil */}
        <div className="mt-4 lg:mt-0 lg:sticky lg:top-6">
          {carrito.length > 0 ? (
            <Card className="cart-in sticky bottom-24 border-tienda-100 lg:static">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-tinta">
                  Cuenta · {unidades} {unidades === 1 ? "unidad" : "unidades"}
                </p>
                <button
                  type="button"
                  onClick={() => setCarrito([])}
                  className="px-2 py-2 text-sm font-bold text-zinc-500 underline underline-offset-2"
                >
                  Vaciar
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {carrito.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-tinta">{c.nombre}</p>
                      <p className="text-sm text-zinc-600">{fmtCOP(c.precioVenta)} c/u · máx {c.stockActual}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Cantidad de ${c.nombre}`}>
                      <button
                        type="button"
                        aria-label={`Quitar uno de ${c.nombre}`}
                        onClick={() => cambiarCant(c.id, -1)}
                        className="press h-11 w-11 rounded-xl border border-zinc-300 bg-white text-xl font-extrabold hover:bg-zinc-100"
                      >
                        −
                      </button>
                      <span aria-live="polite" className="w-8 text-center font-extrabold tabular-nums">
                        {c.cant}
                      </span>
                      <button
                        type="button"
                        aria-label={
                          c.cant >= c.stockActual
                            ? `Sin más stock de ${c.nombre}`
                            : `Agregar uno más de ${c.nombre}`
                        }
                        onClick={() => cambiarCant(c.id, 1)}
                        disabled={c.cant >= c.stockActual}
                        className="press h-11 w-11 rounded-xl border border-zinc-300 bg-white text-xl font-extrabold hover:bg-zinc-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                <div>
                  <label htmlFor="pos-descuento" className="block text-sm font-semibold text-tinta">
                    Descuento $ (promo)
                  </label>
                  <input
                    id="pos-descuento"
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base"
                    inputMode="numeric"
                    placeholder="0"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                  />
                </div>
                <p className="flex justify-between text-sm text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-bold tabular-nums">{fmtCOP(total)}</span>
                </p>
                {descuentoCent > 0 && (
                  <p className="flex justify-between text-sm font-bold text-tienda-800">
                    <span>Descuento</span>
                    <span className="tabular-nums">−{fmtCOP(descuentoCent)}</span>
                  </p>
                )}
              </div>
              <BtnPrimary onClick={cobrar} disabled={cobrando} className="mt-3 text-lg font-extrabold">
                {cobrando ? "Cobrando..." : `Cobrar ${fmtCOP(totalFinal)}`}
              </BtnPrimary>
            </Card>
          ) : (
            <Card className="hidden lg:block">
              <p className="font-extrabold text-tinta">Cuenta vacía</p>
              <p className="mt-1 text-sm text-zinc-600">Tocá el + de un producto para empezar la venta.</p>
            </Card>
          )}
          <div className="mt-3">
            <StatusMsg msg={msg} />
          </div>
        </div>
      </div>

      {scanner && (
        <BarcodeCameraScanner
          title="Escanear para vender"
          continuo
          pie={
            unidades > 0
              ? `${unidades} en la cuenta${ultimoScan ? ` · ${ultimoScan}` : ""}. Seguí escaneando o cerrá para cobrar.`
              : "Escaneá los productos. Cerrá para cobrar."
          }
          onClose={() => setScanner(false)}
          onDetect={onScan}
        />
      )}
    </div>
  );
}
