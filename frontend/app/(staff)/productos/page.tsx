"use client";

import { useEffect, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import {
  actualizarProducto,
  buscarCodigoExacto,
  crearProducto,
  eliminarProducto,
  fetchCategorias,
  listarProductos,
} from "@/features/catalog/api";
import type { Producto } from "@/features/catalog/types";
import { Badge, BtnPrimary, BtnSecondary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";
import BarcodeCameraScanner from "../../components/sales/BarcodeCameraScanner";
import { toast } from "../../components/ui/ToastNotifications";
import { confirmDialog } from "../../components/ui/ConfirmDialog";

type Vencimientos = { vencidos: Producto[]; proximos: Producto[] };

function fmtFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ nombre: "", categoria: "", codigoBarras: "", precioCompra: "", precioVenta: "", stockActual: "0", fechaVencimiento: "", fechaAgregado: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", categoria: "", codigoBarras: "", precioCompra: "", precioVenta: "", stockMinimo: "", fechaVencimiento: "", fechaAgregado: "" });
  const [guardando, setGuardando] = useState(false);
  const [scanner, setScanner] = useState<{ modo: "create" | "edit"; id?: string } | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);

  const PAGE = 50;

  async function load(q = "", append = false, cat = catFilter) {
    try {
      const offset = append ? productos.length : 0;
      const { items, total: t } = await listarProductos({ search: q, limit: PAGE, offset, categoria: cat });
      setProductos((prev) => (append ? [...prev, ...items] : items));
      setTotal(t);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }

  async function loadCategorias() {
    try {
      setCategorias(await fetchCategorias());
    } catch {
      /* no bloquea el listado */
    }
  }

  async function cargarMas() {
    setCargandoMas(true);
    await load(search, true);
    setCargandoMas(false);
  }

  function verEnLista(p: Producto) {
    const clave = p.codigoBarras ?? p.nombre;
    setSearch(clave);
    setResaltado(p.id);
    load(clave);
    window.setTimeout(() => {
      document.getElementById(`prod-card-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  }

  // Aviso al escanear: si el código ya es de otro producto, ofrece verlo.
  async function avisarSiExiste(code: string, excluirId?: string): Promise<void> {
    try {
      const existe = await buscarCodigoExacto(code, excluirId);
      if (!existe) return;
      const ver = await confirmDialog({
        titulo: "Ese código ya existe",
        mensaje: `${existe.nombre} · stock ${existe.stockActual} · ${fmtCOP(existe.precioVenta)}.`,
        confirmar: "Ver producto",
        cancelar: "Dejarlo igual",
      });
      if (ver) verEnLista(existe);
    } catch {
      /* si falla la búsqueda, no frena el registro */
    }
  }

  useEffect(() => {
    load();
    loadCategorias();
    // Código traído desde Vender ("Registrarlo"): se precarga para completar.
    try {
      const pendiente = sessionStorage.getItem("stocklocal-nuevo-codigo");
      if (pendiente) {
        sessionStorage.removeItem("stocklocal-nuevo-codigo");
        setForm((f) => ({ ...f, codigoBarras: pendiente }));
        toast("Código traído del escáner. Completá los datos.");
      }
    } catch {
      /* sin storage, nada para precargar */
    }
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setErr("");
    // El código no se repite: si ya es de otro producto, se muestra en vez de duplicar.
    if (form.codigoBarras.trim()) {
      try {
        const dup = await buscarCodigoExacto(form.codigoBarras);
        if (dup) {
          setErr(`Error: ese código ya es de "${dup.nombre}".`);
          verEnLista(dup);
          return;
        }
      } catch {
        /* si falla la búsqueda, se intenta guardar igual */
      }
    }
    setGuardando(true);
    try {
      await crearProducto({
        nombre: form.nombre,
        categoria: form.categoria.trim() || undefined,
        codigoBarras: form.codigoBarras || undefined,
        precioCompra: Math.round(Number(form.precioCompra) * 100),
        precioVenta: Math.round(Number(form.precioVenta) * 100),
        stockActual: Number(form.stockActual) || 0,
        fechaVencimiento: form.fechaVencimiento || undefined,
        fechaAgregado: form.fechaAgregado || undefined,
      });
      setForm({ nombre: "", categoria: "", codigoBarras: "", precioCompra: "", precioVenta: "", stockActual: "0", fechaVencimiento: "", fechaAgregado: "" });
      toast("Producto guardado.");
      load(search);
      loadCategorias();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  const bajo = productos.filter((p) => p.stockActual <= p.stockMinimo).length;
  const compraNum = Number(form.precioCompra) || 0;
  const ventaNum = Number(form.precioVenta) || 0;

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Productos"
        hint={bajo > 0 ? `${bajo} con poco stock. Revisalos primero.` : "Buscá o registrá en 30 segundos."}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* Columna de acción: buscar + registrar */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(search);
            }}
            className="flex gap-2"
            role="search"
          >
            <label htmlFor="prod-search" className="sr-only">
              Buscar producto
            </label>
            <input
              id="prod-search"
              placeholder="Buscar: arroz, tornillo..."
              className="flex-1 rounded-xl border border-zinc-300 bg-white p-3.5 text-base placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              className="press rounded-xl border border-zinc-300 bg-white px-5 font-bold hover:bg-zinc-100 active:bg-zinc-200"
            >
              Buscar
            </button>
          </form>

          <Card>
            <p id="registro" className="scroll-mt-24 font-extrabold text-tinta">Registro rápido</p>
            <p className="mb-3 text-xs text-zinc-500">Solo lo esencial. El resto después.</p>
            <form onSubmit={crear} className="space-y-3">
              <Field label="Nombre *" htmlFor="prod-nombre">
                <input
                  id="prod-nombre"
                  className={inputCls}
                  placeholder="Ej. Arroz Diana 1kg"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="Categoría" htmlFor="prod-cat" helper="Ej. Abarrotes, Aseo, Licores.">
                <input
                  id="prod-cat"
                  className={inputCls}
                  placeholder="Ej. Abarrotes"
                  list="categorias-existentes"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  autoComplete="off"
                />
                <datalist id="categorias-existentes">
                  {categorias.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Código de barras" htmlFor="prod-codigo" helper="Opcional. Escaneá o escribilo.">
                <div className="flex gap-2">
                  <input
                    id="prod-codigo"
                    className={inputCls}
                    placeholder="Ej. 7702001234567"
                    inputMode="numeric"
                    value={form.codigoBarras}
                    onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setScanner({ modo: "create" })}
                    className="press shrink-0 rounded-xl border border-tienda-700 bg-tienda-50 px-4 font-bold text-tienda-800 hover:bg-tienda-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
                  >
                    Escanear
                  </button>
                </div>
              </Field>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="Compra $ *" htmlFor="prod-compra">
                    <input
                      id="prod-compra"
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="2500"
                      value={form.precioCompra}
                      onChange={(e) => setForm({ ...form, precioCompra: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Venta $ *" htmlFor="prod-venta">
                    <input
                      id="prod-venta"
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="3200"
                      value={form.precioVenta}
                      onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
                      required
                    />
                  </Field>
                </div>
              </div>
              {compraNum > 0 && (
                <div>
                  <div className="flex flex-wrap items-center gap-1.5" aria-label="Sugerir precio por margen">
                    <span className="text-xs font-semibold text-zinc-500">Margen:</span>
                    {[30, 40, 50].map((m) => {
                      const sug = Math.round(compraNum / (1 - m / 100));
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setForm({ ...form, precioVenta: String(sug) })}
                          className="press rounded-full border border-tienda-700 bg-tienda-50 px-3 py-1.5 text-xs font-bold text-tienda-800 hover:bg-tienda-100"
                        >
                          {m}% → ${sug.toLocaleString("es-CO")}
                        </button>
                      );
                    })}
                  </div>
                  {ventaNum > 0 && (
                    <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                      Margen actual: {Math.round(((ventaNum - compraNum) / ventaNum) * 100)}%
                    </p>
                  )}
                </div>
              )}
              <Field label="Stock inicial" htmlFor="prod-stock">
                <input
                  id="prod-stock"
                  className={inputCls}
                  inputMode="numeric"
                  value={form.stockActual}
                  onChange={(e) => setForm({ ...form, stockActual: e.target.value })}
                />
              </Field>
              <Field
                label="Vence (opcional)"
                htmlFor="prod-vencimiento"
                helper="Para perecederos. Se usa en alertas y recordatorios."
              >
                <input
                  id="prod-vencimiento"
                  type="date"
                  className={inputCls}
                  value={form.fechaVencimiento}
                  onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                />
              </Field>
              <Field
                label="Agregado el (opcional)"
                htmlFor="prod-agregado"
                helper="Si lo dejás vacío, queda la fecha de hoy."
              >
                <input
                  id="prod-agregado"
                  type="date"
                  className={inputCls}
                  value={form.fechaAgregado}
                  onChange={(e) => setForm({ ...form, fechaAgregado: e.target.value })}
                />
              </Field>
              <BtnPrimary type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar producto"}
              </BtnPrimary>
            </form>
          </Card>

          <StatusMsg msg={err ? `Error: ${err}` : ""} />
        </div>

        {/* Columna de datos */}
        <div className="mt-4 space-y-3 lg:mt-0">
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
              <button
                type="button"
                onClick={() => {
                  setCatFilter("");
                  load(search, false, "");
                }}
                aria-pressed={catFilter === ""}
                className={`press rounded-full px-4 py-2.5 text-sm font-bold ${
                  catFilter === "" ? "bg-tienda-700 text-white shadow-pop" : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    const next = catFilter === c ? "" : c;
                    setCatFilter(next);
                    load(search, false, next);
                  }}
                  aria-pressed={catFilter === c}
                  className={`press max-w-[160px] truncate rounded-full px-4 py-2.5 text-sm font-bold ${
                    catFilter === c ? "bg-tienda-700 text-white shadow-pop" : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {productos.length === 0 ? (
            <EmptyState title="Todavía no hay productos" hint="Guardá el primero a la izquierda. Te toma 30 segundos." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {productos.map((p, i) => {
                const isBajo = p.stockActual <= p.stockMinimo;
                const editing = editingId === p.id;
                return (
                  <li
                    key={p.id}
                    id={`prod-card-${p.id}`}
                    className={`rise lift scroll-mt-24 space-y-2 rounded-card border bg-white p-4 shadow-card ${
                      resaltado === p.id ? "border-tienda-700 ring-2 ring-tienda-700/30" : "border-zinc-200"
                    }`}
                    style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-tinta">{p.nombre}</p>
                        {p.categoria && (
                          <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                            {p.categoria}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 font-display text-xl font-extrabold tabular-nums tracking-tight text-tinta">
                        {fmtCOP(p.precioVenta)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                      <span className="font-bold tabular-nums text-zinc-700">
                        Stock {p.stockActual}
                      </span>
                      {isBajo ? <Badge tone="bad">Bajo stock</Badge> : <Badge tone="ok">Al día</Badge>}
                    </div>
                    {(p.fechaVencimiento || p.fechaAgregado) && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.fechaVencimiento && (
                          <Badge tone="warn">Vence {fmtFechaCorta(p.fechaVencimiento)}</Badge>
                        )}
                        {p.fechaAgregado && (
                          <Badge tone="neutral">Agregado {fmtFechaCorta(p.fechaAgregado)}</Badge>
                        )}
                      </div>
                    )}
                    {editing ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setErr("");
                          if (editForm.codigoBarras.trim()) {
                            try {
                              const dup = await buscarCodigoExacto(editForm.codigoBarras, p.id);
                              if (dup) {
                                setErr(`Error: ese código ya es de "${dup.nombre}".`);
                                verEnLista(dup);
                                return;
                              }
                            } catch {
                              /* si falla la búsqueda, se intenta guardar igual */
                            }
                          }
                          try {
                            await actualizarProducto(p.id, {
                              nombre: editForm.nombre,
                              categoria: editForm.categoria.trim() || undefined,
                              codigoBarras: editForm.codigoBarras || undefined,
                              precioCompra: Math.round(Number(editForm.precioCompra) * 100),
                              precioVenta: Math.round(Number(editForm.precioVenta) * 100),
                              stockMinimo: Number(editForm.stockMinimo) || 0,
                              fechaVencimiento: editForm.fechaVencimiento || null,
                              fechaAgregado: editForm.fechaAgregado || undefined,
                            });
                            setEditingId(null);
                            toast("Producto actualizado.");
                            load(search);
                          } catch (e: unknown) {
                            setErr(e instanceof Error ? e.message : "No se pudo actualizar");
                          }
                        }}
                        className="space-y-2 border-t border-zinc-100 pt-3"
                      >
                        <Field label="Nombre" htmlFor={`edit-nombre-${p.id}`}>
                          <input
                            id={`edit-nombre-${p.id}`}
                            className={inputCls}
                            value={editForm.nombre}
                            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                            required
                          />
                        </Field>
                        <Field label="Categoría" htmlFor={`edit-cat-${p.id}`}>
                          <input
                            id={`edit-cat-${p.id}`}
                            className={inputCls}
                            list="categorias-existentes"
                            value={editForm.categoria}
                            onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                          />
                        </Field>
                        <Field label="Código de barras" htmlFor={`edit-codigo-${p.id}`}>
                          <div className="flex gap-2">
                            <input
                              id={`edit-codigo-${p.id}`}
                              className={inputCls}
                              inputMode="numeric"
                              value={editForm.codigoBarras}
                              onChange={(e) => setEditForm({ ...editForm, codigoBarras: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setScanner({ modo: "edit", id: p.id })}
                              className="press shrink-0 rounded-xl border border-tienda-700 bg-tienda-50 px-4 font-bold text-tienda-800 hover:bg-tienda-100"
                            >
                              Escanear
                            </button>
                          </div>
                        </Field>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Field label="Compra $" htmlFor={`edit-compra-${p.id}`}>
                              <input
                                id={`edit-compra-${p.id}`}
                                className={inputCls}
                                inputMode="numeric"
                                value={editForm.precioCompra}
                                onChange={(e) => setEditForm({ ...editForm, precioCompra: e.target.value })}
                                required
                              />
                            </Field>
                          </div>
                          <div className="flex-1">
                            <Field label="Venta $" htmlFor={`edit-venta-${p.id}`}>
                              <input
                                id={`edit-venta-${p.id}`}
                                className={inputCls}
                                inputMode="numeric"
                                value={editForm.precioVenta}
                                onChange={(e) => setEditForm({ ...editForm, precioVenta: e.target.value })}
                                required
                              />
                            </Field>
                          </div>
                          <div className="w-20">
                            <Field label="Mín" htmlFor={`edit-min-${p.id}`}>
                              <input
                                id={`edit-min-${p.id}`}
                                className={inputCls}
                                inputMode="numeric"
                                value={editForm.stockMinimo}
                                onChange={(e) => setEditForm({ ...editForm, stockMinimo: e.target.value })}
                              />
                            </Field>
                          </div>
                        </div>
                        <Field label="Vence (opcional)" htmlFor={`edit-vencimiento-${p.id}`}>
                          <input
                            id={`edit-vencimiento-${p.id}`}
                            type="date"
                            className={inputCls}
                            value={editForm.fechaVencimiento}
                            onChange={(e) => setEditForm({ ...editForm, fechaVencimiento: e.target.value })}
                          />
                        </Field>
                        <Field label="Agregado el" htmlFor={`edit-agregado-${p.id}`}>
                          <input
                            id={`edit-agregado-${p.id}`}
                            type="date"
                            className={inputCls}
                            value={editForm.fechaAgregado}
                            onChange={(e) => setEditForm({ ...editForm, fechaAgregado: e.target.value })}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <BtnPrimary type="submit">Guardar</BtnPrimary>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="press flex-1 rounded-action border border-zinc-300 px-4 py-3 font-bold hover:bg-zinc-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label={`Editar ${p.nombre}`}
                          onClick={() => {
                            setEditingId(p.id);
                            setEditForm({
                              nombre: p.nombre,
                              categoria: p.categoria ?? "",
                              codigoBarras: p.codigoBarras ?? "",
                              precioCompra: String(p.precioCompra / 100),
                              precioVenta: String(p.precioVenta / 100),
                              stockMinimo: String(p.stockMinimo),
                              fechaVencimiento: p.fechaVencimiento ? p.fechaVencimiento.slice(0, 10) : "",
                              fechaAgregado: p.fechaAgregado ? p.fechaAgregado.slice(0, 10) : "",
                            });
                          }}
                          className="press flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold hover:bg-zinc-100 active:bg-zinc-200"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          aria-label={`Borrar ${p.nombre}`}
                          onClick={async () => {
                            const ok = await confirmDialog({
                              titulo: `¿Borrar "${p.nombre}"?`,
                              mensaje: "No se puede deshacer. El historial de ventas se mantiene.",
                              confirmar: "Borrar",
                              danger: true,
                            });
                            if (!ok) return;
                            try {
                              await eliminarProducto(p.id);
                              toast("Producto desactivado. El historial se mantiene.");
                              load(search);
                            } catch (e: unknown) {
                              setErr(e instanceof Error ? e.message : "No se pudo borrar");
                            }
                          }}
                          className="press flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 active:bg-red-100"
                        >
                          Borrar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {productos.length < total && (
            <BtnSecondary onClick={cargarMas} disabled={cargandoMas} className="font-bold">
              {cargandoMas ? "Cargando..." : `Cargar más (${productos.length} de ${total})`}
            </BtnSecondary>
          )}
        </div>
      </div>

      {scanner && (
        <BarcodeCameraScanner
          title="Escanear producto"
          onClose={() => setScanner(null)}
          onDetect={async (code) => {
            const modo = scanner.modo;
            const idEdit = scanner.id;
            setScanner(null);
            if (modo === "create") {
              setForm((f) => ({ ...f, codigoBarras: code }));
              await avisarSiExiste(code);
            } else if (idEdit) {
              setEditForm((f) => ({ ...f, codigoBarras: code }));
              await avisarSiExiste(code, idEdit);
            }
          }}
        />
      )}
    </div>
  );
}
