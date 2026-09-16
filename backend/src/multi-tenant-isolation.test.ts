import "dotenv/config";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { app } from "./app.js";
import { prisma } from "./config/prisma-client.js";

/* Tests de integración sobre una instancia real de la API (puerto efímero).
   Requieren Postgres arriba: docker compose up -d db && npx prisma migrate deploy */

let server: Server;
let base = "";
const negociosCreados: string[] = [];

async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

async function crearNegocio(nombre: string) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const r = await req("POST", "/auth/register", undefined, {
    negocio: nombre,
    nombre: "Dueño Test",
    email: `test-${stamp}@stocklocal.test`,
    password: "clave123",
  });
  assert.equal(r.status, 201, `register falló: ${JSON.stringify(r.body)}`);
  negociosCreados.push(r.body.negocio.id);
  return { token: r.body.token as string, negocioId: r.body.negocio.id as string };
}

before(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      "Base de datos no disponible. Levantá Postgres: `docker compose up -d db && npx prisma migrate deploy`"
    );
  }
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  try {
    if (negociosCreados.length) {
      await prisma.negocio.deleteMany({ where: { id: { in: negociosCreados } } });
    }
  } catch {
    // limpieza best-effort; no debe hacer fallar la suite
  }
  await prisma.$disconnect();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Aislamiento multi-tenant", () => {
  it("A no ve ni toca datos de B", async () => {
    const A = await crearNegocio("Tienda A test");
    const B = await crearNegocio("Tienda B test");

    const pa = await req("POST", "/productos", A.token, {
      nombre: "Arroz A",
      precioCompra: 250000,
      precioVenta: 320000,
      stockActual: 10,
    });
    assert.equal(pa.status, 201);

    const pb = await req("POST", "/productos", B.token, {
      nombre: "Tornillo B",
      precioCompra: 10000,
      precioVenta: 20000,
      stockActual: 5,
    });
    assert.equal(pb.status, 201);

    // Listas aisladas
    const listaA = await req("GET", "/productos", A.token);
    const nombresA = (listaA.body as any[]).map((p) => p.nombre);
    assert.ok(nombresA.includes("Arroz A"));
    assert.ok(!nombresA.includes("Tornillo B"), "A no debe ver productos de B");

    // Cruce por id directo: 404 (no 403) para no filtrar existencia
    assert.equal((await req("PATCH", `/productos/${pb.body.id}`, A.token, { nombre: "hackeado" })).status, 404);
    assert.equal((await req("DELETE", `/productos/${pb.body.id}`, A.token)).status, 404);
    assert.equal(
      (await req("POST", "/movimientos", A.token, { productoId: pb.body.id, tipo: "SALIDA", cantidad: 1 })).status,
      400
    );
    assert.equal(
      (await req("POST", "/ventas", A.token, { items: [{ productoId: pb.body.id, cantidad: 1 }] })).status,
      400
    );

    // Proveedores aislados
    await req("POST", "/proveedores", B.token, { nombre: "Prov B" });
    const provsA = await req("GET", "/proveedores", A.token);
    assert.ok(!(provsA.body as any[]).some((p) => p.nombre === "Prov B"), "A no debe ver proveedores de B");

    // Reporte acotado al negocio
    const repA = await req("GET", "/reportes/resumen", A.token);
    assert.equal(repA.body.totalProductos, 1, "el reporte de A debe contar solo sus productos");

    // Sin token
    assert.equal((await req("GET", "/productos")).status, 401);
  });
});

describe("Concurrencia de ventas (sin sobreventa)", () => {
  it("con stock 3, dos ventas de 2 en paralelo: gana una sola", async () => {
    const N = await crearNegocio("Tienda concurrencia");
    const prod = await req("POST", "/productos", N.token, {
      nombre: "Producto concurrencia",
      precioCompra: 100000,
      precioVenta: 150000,
      stockActual: 3,
    });
    assert.equal(prod.status, 201);
    const id = prod.body.id as string;

    const resultados = await Promise.all(
      [0, 1].map(() => req("POST", "/ventas", N.token, { items: [{ productoId: id, cantidad: 2 }] }))
    );
    const exitos = resultados.filter((r) => r.status === 201).length;
    assert.equal(exitos, 1, `se esperaba 1 venta exitosa, hubo ${exitos}`);

    const check = await req("GET", `/productos?search=Producto`, N.token);
    const stock = (check.body as any[])[0].stockActual;
    assert.equal(stock, 1, `el stock quedó en ${stock} (esperado 1, nunca negativo)`);
  });
});

async function negocioConProducto(nombre: string, stock: number) {
  const N = await crearNegocio(nombre);
  const prod = await req("POST", "/productos", N.token, {
    nombre: `Prod ${nombre}`,
    precioCompra: 100000,
    precioVenta: 150000,
    stockActual: stock,
  });
  assert.equal(prod.status, 201);
  return { token: N.token, id: prod.body.id as string };
}

describe("Idempotencia de ventas (reintentos offline)", () => {
  it("reenviar la misma clave devuelve la venta original sin descontar de nuevo", async () => {
    const { token, id } = await negocioConProducto("idempotencia", 10);
    const key = "test-key-replay-0001";
    const body = { items: [{ productoId: id, cantidad: 2 }], idempotencyKey: key };

    const r1 = await req("POST", "/ventas", token, body);
    assert.equal(r1.status, 201);

    const r2 = await req("POST", "/ventas", token, body);
    assert.equal(r2.status, 200, "el reintento debe reconocer la clave");
    assert.equal(r2.body.id, r1.body.id, "debe devolver la misma venta");

    const check = await req("GET", `/productos?search=idempotencia`, token);
    assert.equal(check.body[0].stockActual, 8, "el stock se descuenta una sola vez");
  });

  it("dos reenvíos concurrentes de la misma clave tampoco duplican", async () => {
    const { token, id } = await negocioConProducto("idempotencia-par", 10);
    const key = "test-key-paralelo-0002";
    const body = { items: [{ productoId: id, cantidad: 3 }], idempotencyKey: key };

    const [a, b] = await Promise.all([req("POST", "/ventas", token, body), req("POST", "/ventas", token, body)]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    assert.deepEqual(statuses, [200, 201], `esperaba 200 y 201, obtuve ${statuses}`);

    const check = await req("GET", `/productos?search=idempotencia-par`, token);
    assert.equal(check.body[0].stockActual, 7, "el stock se descuenta una sola vez aunque haya carrera");
  });
});

describe("Soft-delete de productos", () => {
  it("borrar un producto con ventas lo desactiva sin romper el historial", async () => {
    const { token, id } = await negocioConProducto("softdelete", 5);

    // Lo vendemos para que tenga historial (antes el DELETE fallaba con 409)
    const venta = await req("POST", "/ventas", token, { items: [{ productoId: id, cantidad: 1 }] });
    assert.equal(venta.status, 201);

    const del = await req("DELETE", `/productos/${id}`, token);
    assert.equal(del.status, 204, "el soft-delete debe permitir borrar aunque tenga ventas");

    // Desaparece de listas y alertas
    const lista = await req("GET", "/productos", token);
    assert.ok(!(lista.body as any[]).some((p) => p.id === id), "el producto ya no debe listarse");
    const alertas = await req("GET", "/productos/alertas", token);
    assert.ok(!(alertas.body as any[]).some((p) => p.id === id), "no debe aparecer en alertas");

    // El historial sobrevive
    const ventas = await req("GET", "/ventas", token);
    assert.equal((ventas.body as any[])[0].items[0].productoId, id, "la venta histórica se mantiene");

    // Y ya no se puede vender
    const reintento = await req("POST", "/ventas", token, { items: [{ productoId: id, cantidad: 1 }] });
    assert.equal(reintento.status, 400, "un producto desactivado no se puede vender");
  });
});

describe("Paginación de productos", () => {
  it("respeta limit y offset y expone el total en X-Total-Count", async () => {
    const N = await crearNegocio("paginacion");
    for (const n of ["P1", "P2", "P3"]) {
      const r = await req("POST", "/productos", N.token, {
        nombre: `Pag ${n}`,
        precioCompra: 1000,
        precioVenta: 2000,
        stockActual: 1,
      });
      assert.equal(r.status, 201);
    }

    const pagina1 = await req("GET", "/productos?search=Pag&limit=2&offset=0", N.token);
    assert.equal(pagina1.body.length, 2, "la primera página trae 2");
    assert.equal(pagina1.headers.get("x-total-count"), "3", "el total va en X-Total-Count");

    const pagina2 = await req("GET", "/productos?search=Pag&limit=2&offset=2", N.token);
    assert.equal(pagina2.body.length, 1, "la segunda página trae el restante");

    const ids = new Set([...pagina1.body, ...pagina2.body].map((p: any) => p.id));
    assert.equal(ids.size, 3, "las páginas no repiten productos");
  });
});

describe("Recuperación de contraseña", () => {
  it("permite resetear con el token y entrar con la nueva clave", async () => {
    const email = `reset-${Date.now()}-${Math.random().toString(36).slice(2)}@stocklocal.test`;
    const reg = await req("POST", "/auth/register", undefined, {
      negocio: "Tienda reset",
      nombre: "Ana",
      email,
      password: "claveVieja1",
    });
    assert.equal(reg.status, 201);
    negociosCreados.push(reg.body.negocio.id);

    const preLogin = await req("POST", "/auth/login", undefined, { email, password: "claveVieja1" });
    assert.equal(preLogin.status, 200, "la clave vieja debe funcionar antes del reset");

    const forgot = await req("POST", "/auth/forgot", undefined, { email });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.body.devLink, "en entorno no-productivo debe devolver el link");
    const token = new URL(forgot.body.devLink).searchParams.get("token");
    assert.ok(token, "el link debe traer token");

    const reset = await req("POST", "/auth/reset", undefined, { token, password: "claveNueva2" });
    assert.equal(reset.status, 200);

    const vieja = await req("POST", "/auth/login", undefined, { email, password: "claveVieja1" });
    assert.equal(vieja.status, 401, "la clave vieja ya no debe servir");
    const nueva = await req("POST", "/auth/login", undefined, { email, password: "claveNueva2" });
    assert.equal(nueva.status, 200, "la clave nueva debe entrar");
  });

  it("un token inválido no cambia la contraseña", async () => {
    const r = await req("POST", "/auth/reset", undefined, {
      token: "0123456789abcdef0123456789abcdef",
      password: "otraClave3",
    });
    assert.equal(r.status, 400);
  });

  it("forgot con email inexistente responde 200 sin revelar nada", async () => {
    const r = await req("POST", "/auth/forgot", undefined, { email: "nadie@stocklocal.test" });
    assert.equal(r.status, 200);
    assert.equal(r.body.devLink, undefined, "no debe devolver link para un email inexistente");
  });
});

describe("Auditoría", () => {
  it("cada movimiento y venta queda firmado por quien lo hizo", async () => {
    const suf = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const emailJefe = `jefe-${suf}@stocklocal.test`;
    const emailCajero = `cajero-${suf}@stocklocal.test`;

    const reg = await req("POST", "/auth/register", undefined, {
      negocio: "Tienda audit",
      nombre: "Jefe",
      email: emailJefe,
      password: "clave123",
    });
    assert.equal(reg.status, 201);
    negociosCreados.push(reg.body.negocio.id);
    const tokenJefe = reg.body.token as string;

    const emp = await req("POST", "/usuarios/empleados", tokenJefe, {
      nombre: "Cajero",
      email: emailCajero,
      password: "clave123",
    });
    assert.equal(emp.status, 201);
    const loginCajero = await req("POST", "/auth/login", undefined, { email: emailCajero, password: "clave123" });
    assert.equal(loginCajero.status, 200);
    const tokenCajero = loginCajero.body.token as string;

    const prod = await req("POST", "/productos", tokenJefe, {
      nombre: "Audit prod",
      precioCompra: 1000,
      precioVenta: 2000,
      stockActual: 10,
    });
    assert.equal(prod.status, 201);
    const id = prod.body.id as string;

    // Movimiento del cajero: queda firmado con su nombre
    const mov = await req("POST", "/movimientos", tokenCajero, {
      productoId: id,
      tipo: "ENTRADA",
      cantidad: 5,
    });
    assert.equal(mov.status, 201);
    assert.equal(mov.body.creadoPor?.nombre, "Cajero", "el movimiento debe traer su autor");

    // Venta del jefe
    const venta = await req("POST", "/ventas", tokenJefe, { items: [{ productoId: id, cantidad: 1 }] });
    assert.equal(venta.status, 201);

    const ventas = await req("GET", "/ventas", tokenJefe);
    const v = (ventas.body as any[]).find((x) => x.id === venta.body.id);
    assert.equal(v?.creadoPor?.nombre, "Jefe", "la venta debe traer su autor");

    const movs = await req("GET", "/movimientos", tokenJefe);
    assert.ok(
      (movs.body as any[]).some((m) => m.creadoPor?.nombre === "Cajero"),
      "el historial debe mostrar al cajero"
    );
  });
});

describe("Descuentos por rol", () => {
  it("empleado hasta 10%, dueño sin tope, nunca sobre el subtotal", async () => {
    const suf = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const emailJefe = `dj-${suf}@stocklocal.test`;
    const emailCajero = `dc-${suf}@stocklocal.test`;

    const reg = await req("POST", "/auth/register", undefined, {
      negocio: "Tienda desc",
      nombre: "Jefe",
      email: emailJefe,
      password: "clave123",
    });
    assert.equal(reg.status, 201);
    negociosCreados.push(reg.body.negocio.id);
    const tokenJefe = reg.body.token as string;

    const emp = await req("POST", "/usuarios/empleados", tokenJefe, {
      nombre: "Cajero",
      email: emailCajero,
      password: "clave123",
    });
    assert.equal(emp.status, 201);
    const tokenCajero = (
      await req("POST", "/auth/login", undefined, { email: emailCajero, password: "clave123" })
    ).body.token as string;

    const prod = await req("POST", "/productos", tokenJefe, {
      nombre: "Prod desc",
      precioCompra: 500000,
      precioVenta: 1000000, // $10.000
      stockActual: 10,
    });
    assert.equal(prod.status, 201);
    const id = prod.body.id as string;
    const item = [{ productoId: id, cantidad: 1 }];

    // Empleado: 20% → bloqueado
    assert.equal((await req("POST", "/ventas", tokenCajero, { items: item, descuento: 200000 })).status, 400);
    // Empleado: 5% → ok, total = 9500.00 en centavos
    const ok = await req("POST", "/ventas", tokenCajero, { items: item, descuento: 50000 });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.total, 950000, "el total descuenta la promoción");
    assert.equal(ok.body.descuento, 50000);
    // Dueño: 50% → ok
    const jefe = await req("POST", "/ventas", tokenJefe, { items: item, descuento: 500000 });
    assert.equal(jefe.status, 201);
    assert.equal(jefe.body.total, 500000);
    // Nadie puede descontar más que el subtotal
    assert.equal((await req("POST", "/ventas", tokenJefe, { items: item, descuento: 1000001 })).status, 400);
  });
});

describe("Exportar CSV", () => {
  it("ventas.csv e inventario.csv devuelven CSV con los datos", async () => {
    const N = await crearNegocio("csv");
    const prod = await req("POST", "/productos", N.token, {
      nombre: "CSV prod",
      precioCompra: 1000,
      precioVenta: 2500,
      stockActual: 4,
    });
    assert.equal(prod.status, 201);
    assert.equal((await req("POST", "/ventas", N.token, { items: [{ productoId: prod.body.id, cantidad: 2 }] })).status, 201);

    const v = await req("GET", "/reportes/ventas.csv", N.token);
    assert.equal(v.status, 200);
    assert.ok(String(v.headers.get("content-type")).includes("text/csv"), "debe servirse como CSV");
    assert.ok(String(v.body).includes("CSV prod"), "el CSV de ventas debe traer el producto");
    assert.ok(String(v.body).includes("venta_id"), "debe traer encabezado");

    const inv = await req("GET", "/reportes/inventario.csv", N.token);
    assert.equal(inv.status, 200);
    assert.ok(String(inv.body).includes("CSV prod"), "el CSV de inventario debe traer el producto");
  });

  it("gastos.csv y caja.csv devuelven CSV con los datos", async () => {
    const N = await crearNegocio("csvcaja");
    assert.equal((await req("POST", "/gastos", N.token, { concepto: "Luz CSV", monto: 50000 })).status, 201);
    const prod = (
      await req("POST", "/productos", N.token, {
        nombre: "CSV caja",
        precioCompra: 50000,
        precioVenta: 100000,
        stockActual: 5,
      })
    ).body;
    assert.equal((await req("POST", "/ventas", N.token, { items: [{ productoId: prod.id, cantidad: 1 }] })).status, 201);
    assert.equal((await req("POST", "/caja/cerrar", N.token, { contado: 100000 })).status, 201);

    const g = await req("GET", "/reportes/gastos.csv", N.token);
    assert.equal(g.status, 200);
    assert.ok(String(g.body).includes("Luz CSV"), "el CSV de gastos debe traer el concepto");

    const c = await req("GET", "/reportes/caja.csv", N.token);
    assert.equal(c.status, 200);
    assert.ok(String(c.body).includes("diferencia"), "debe traer encabezado");
    assert.ok(String(c.body).includes("1000.00"), "el arqueo cuadra $1.000 en efectivo");
  });
});

describe("Vencimientos, caja y gastos", () => {
  it("alerta vencidos y próximos, arquea la caja y resta los gastos", async () => {
    const N = await crearNegocio("vencaja");
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const en3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const en60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

    for (const [nombre, fv] of [["Leche V", ayer], ["Yogur V", en3], ["Arroz V", en60]] as const) {
      const r = await req("POST", "/productos", N.token, {
        nombre,
        fechaVencimiento: fv,
        precioCompra: 1000,
        precioVenta: 2000,
        stockActual: 5,
      });
      assert.equal(r.status, 201, `crear ${nombre}: ${JSON.stringify(r.body)}`);
    }

    const venc = await req("GET", "/productos/vencimientos?dias=7", N.token);
    assert.equal(venc.status, 200);
    assert.ok((venc.body.vencidos as any[]).some((p) => p.nombre === "Leche V"), "detecta vencidos");
    assert.ok((venc.body.proximos as any[]).some((p) => p.nombre === "Yogur V"), "detecta próximos");
    assert.ok(
      !(venc.body.proximos as any[]).some((p) => p.nombre === "Arroz V"),
      "fuera de ventana no aparece"
    );

    // Venta en efectivo + gasto
    const prod = (
      await req("POST", "/productos", N.token, {
        nombre: "Galleta caja",
        precioCompra: 50000,
        precioVenta: 100000,
        stockActual: 10,
      })
    ).body;
    const venta = await req("POST", "/ventas", N.token, {
      items: [{ productoId: prod.id, cantidad: 2 }],
      metodoPago: "NEQUI",
    });
    assert.equal(venta.status, 201);
    assert.equal(venta.body.metodoPago, "NEQUI");
    await req("POST", "/ventas", N.token, { items: [{ productoId: prod.id, cantidad: 1 }] });

    const gasto = await req("POST", "/gastos", N.token, { concepto: "Luz", monto: 50000 });
    assert.equal(gasto.status, 201);

    // Caja: solo cuenta el efectivo (1 x $1.000)
    const actual = await req("GET", "/caja/actual", N.token);
    assert.equal(actual.body.esperado, 100000, "el arqueo solo cuadra efectivo");
    assert.equal(actual.body.cantidadVentas, 1);

    const cierre = await req("POST", "/caja/cerrar", N.token, { contado: 90000 });
    assert.equal(cierre.status, 201);
    assert.equal(cierre.body.diferencia, -10000, "faltan $100");

    // Resumen con ganancia real (ventas - gastos del mes)
    const rep = await req("GET", "/reportes/resumen", N.token);
    assert.equal(rep.body.totalGastos, 50000);
    // ganancia: ventas (150000) - gastos (50000) = 100000
    assert.equal(rep.body.gananciaReal, rep.body.gananciaEstimada - 50000);
  });
});

describe("Pedidos a proveedores", () => {
  it("auto desde bajo stock → enviar → recibir suma stock (y no dos veces)", async () => {
    const N = await crearNegocio("pedidos");
    const prov = await req("POST", "/proveedores", N.token, { nombre: "Prov Ped" });
    assert.equal(prov.status, 201);
    const prod = await req("POST", "/productos", N.token, {
      nombre: "Pedido prod",
      precioCompra: 1000,
      precioVenta: 2000,
      stockActual: 2,
      stockMinimo: 5,
    });
    assert.equal(prod.status, 201);
    const id = prod.body.id as string;

    const creado = await req("POST", "/pedidos", N.token, { proveedorId: prov.body.id, auto: true });
    assert.equal(creado.status, 201);
    assert.equal(creado.body.estado, "BORRADOR");
    assert.equal(creado.body.items[0].cantidad, 8, "sugiere reponer hasta 2x el mínimo (5*2-2)");

    const enviado = await req("POST", `/pedidos/${creado.body.id}/enviar`, N.token);
    assert.equal(enviado.status, 200);
    assert.equal(enviado.body.estado, "ENVIADO");

    const recibido = await req("POST", `/pedidos/${creado.body.id}/recibir`, N.token);
    assert.equal(recibido.status, 200);
    assert.equal(recibido.body.estado, "RECIBIDO");

    const check = await req("GET", "/productos?search=Pedido", N.token);
    assert.equal(check.body[0].stockActual, 10, "recibir suma el stock (2+8)");

    assert.equal((await req("POST", `/pedidos/${creado.body.id}/recibir`, N.token)).status, 400);
  });

  it("adjunta foto de comprobante solo en enviado o recibido", async () => {
    const N = await crearNegocio("pedidos-foto");
    const prov = await req("POST", "/proveedores", N.token, { nombre: "Prov Foto" });
    const prod = await req("POST", "/productos", N.token, {
      nombre: "Foto prod",
      precioCompra: 1000,
      precioVenta: 2000,
      stockActual: 2,
      stockMinimo: 5,
    });
    const creado = await req("POST", "/pedidos", N.token, {
      proveedorId: prov.body.id,
      items: [{ productoId: prod.body.id, cantidad: 1 }],
    });
    assert.equal(creado.status, 201);
    const id = creado.body.id as string;
    const foto = "data:image/jpeg;base64," + "a".repeat(200);

    // En borrador: bloqueado
    assert.equal((await req("POST", `/pedidos/${id}/comprobante`, N.token, { foto })).status, 400);

    assert.equal((await req("POST", `/pedidos/${id}/enviar`, N.token)).status, 200);
    const conFoto = await req("POST", `/pedidos/${id}/comprobante`, N.token, { foto });
    assert.equal(conFoto.status, 200);
    assert.equal(conFoto.body.comprobanteUrl, foto);

    // Foto inválida: 400
    assert.equal(
      (await req("POST", `/pedidos/${id}/comprobante`, N.token, { foto: "no-es-imagen" })).status,
      400
    );

    // Otro negocio no toca el pedido
    const M = await crearNegocio("pedidos-foto-otro");
    assert.equal((await req("POST", `/pedidos/${id}/comprobante`, M.token, { foto })).status, 404);
  });
});

describe("Categorías y búsqueda", () => {
  it("filtra por categoría, lista las distintas y busca por nombre o código", async () => {
    const N = await crearNegocio("categorias");
    const mk = (nombre: string, categoria: string, codigoBarras?: string) =>
      req("POST", "/productos", N.token, {
        nombre,
        categoria,
        ...(codigoBarras ? { codigoBarras } : {}),
        precioCompra: 1000,
        precioVenta: 2000,
        stockActual: 5,
      });

    assert.equal((await mk("Arroz Cat", "Abarrotes", "770999000111")).status, 201);
    assert.equal((await mk("Jabón Cat", "Aseo")).status, 201);

    const cats = await req("GET", "/productos/categorias", N.token);
    assert.deepEqual([...(cats.body as string[])].sort(), ["Abarrotes", "Aseo"]);

    const aseo = await req("GET", "/productos?categoria=Aseo", N.token);
    assert.equal(aseo.body.length, 1, "el filtro por categoría debe acotar");
    assert.equal(aseo.body[0].categoria, "Aseo");

    const porNombre = await req("GET", "/productos?search=arrOZ", N.token);
    assert.ok(
      (porNombre.body as any[]).some((p) => p.nombre === "Arroz Cat"),
      "la búsqueda parcial insensible debe encontrarlo"
    );

    const porCodigo = await req("GET", "/productos?search=770999", N.token);
    assert.ok(
      (porCodigo.body as any[]).some((p) => p.nombre === "Arroz Cat"),
      "la búsqueda por código de barras debe encontrarlo"
    );
  });
});

describe("Recordatorios por WhatsApp", () => {
  it("guarda el WhatsApp del negocio y arma los recordatorios de vencimientos y bajo stock", async () => {
    const N = await crearNegocio("recordatorios");

    // El WhatsApp se normaliza a solo dígitos (wa.me lo exige).
    const patch = await req("PATCH", "/negocio", N.token, { whatsapp: "+57 300 123 4567" });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.whatsapp, "573001234567");

    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const en3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await req("POST", "/productos", N.token, {
      nombre: "Leche R",
      fechaVencimiento: ayer,
      precioCompra: 1000,
      precioVenta: 2000,
      stockActual: 5,
    });
    await req("POST", "/productos", N.token, {
      nombre: "Yogur R",
      fechaVencimiento: en3,
      precioCompra: 1000,
      precioVenta: 2000,
      stockActual: 5,
      stockMinimo: 10,
    });

    const r = await req("GET", "/recordatorios?dias=7", N.token);
    assert.equal(r.status, 200);
    assert.equal(r.body.whatsapp, "573001234567");
    assert.equal(r.body.vencidos, 1, "detecta el vencido");
    assert.equal(r.body.proximos, 1, "detecta el próximo");
    const venc = (r.body.recordatorios as any[]).find((x) => x.tipo === "VENCIMIENTOS");
    assert.ok(venc.mensaje.includes("Leche R"), "el mensaje nombra el producto");
    const bajo = (r.body.recordatorios as any[]).find((x) => x.tipo === "BAJO_STOCK");
    assert.ok(bajo.cantidad >= 1, "marca el bajo stock");
  });

  it("un empleado no puede cambiar el WhatsApp del negocio", async () => {
    const suf = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const emailJefe = `nw-jefe-${suf}@stocklocal.test`;
    const emailCajero = `nw-cajero-${suf}@stocklocal.test`;
    const reg = await req("POST", "/auth/register", undefined, {
      negocio: "Tienda whatsapp",
      nombre: "Jefe",
      email: emailJefe,
      password: "clave123",
    });
    assert.equal(reg.status, 201);
    negociosCreados.push(reg.body.negocio.id);

    const emp = await req("POST", "/usuarios/empleados", reg.body.token, {
      nombre: "Cajero",
      email: emailCajero,
      password: "clave123",
    });
    assert.equal(emp.status, 201);
    const tokenCajero = (
      await req("POST", "/auth/login", undefined, { email: emailCajero, password: "clave123" })
    ).body.token as string;

    const patch = await req("PATCH", "/negocio", tokenCajero, { whatsapp: "3001112233" });
    assert.equal(patch.status, 403, "solo el dueño configura el WhatsApp");
  });
});

describe("Turnos de caja", () => {
  it("abre, reparte ventas por empleado y cierra enlazando el arqueo", async () => {
    const suf = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const emailJefe = `t-jefe-${suf}@stocklocal.test`;
    const emailCajero = `t-cajero-${suf}@stocklocal.test`;

    const reg = await req("POST", "/auth/register", undefined, {
      negocio: "Tienda turnos",
      nombre: "Jefe",
      email: emailJefe,
      password: "clave123",
    });
    assert.equal(reg.status, 201);
    negociosCreados.push(reg.body.negocio.id);
    const tokenJefe = reg.body.token as string;

    const emp = await req("POST", "/usuarios/empleados", tokenJefe, {
      nombre: "Cajero",
      email: emailCajero,
      password: "clave123",
    });
    assert.equal(emp.status, 201);
    const tokenCajero = (
      await req("POST", "/auth/login", undefined, { email: emailCajero, password: "clave123" })
    ).body.token as string;

    const prod = await req("POST", "/productos", tokenJefe, {
      nombre: "Prod turno",
      precioCompra: 50000,
      precioVenta: 100000, // $1.000
      stockActual: 10,
    });
    assert.equal(prod.status, 201);
    const id = prod.body.id as string;

    // Sin turno: actual viene sin turno
    const sinTurno = await req("GET", "/caja/actual", tokenJefe);
    assert.equal(sinTurno.body.turno, null);

    // El jefe abre con $500 de fondo
    const ap = await req("POST", "/turnos/abrir", tokenJefe, { fondoInicial: 50000 });
    assert.equal(ap.status, 201);
    assert.equal(ap.body.estado, "ABIERTO");
    assert.equal(ap.body.abiertoPor?.nombre, "Jefe");

    // Segundo turno abierto: bloqueado
    assert.equal((await req("POST", "/turnos/abrir", tokenCajero, {})).status, 400);

    // El cajero vende 2 x $1.000 en efectivo
    assert.equal(
      (await req("POST", "/ventas", tokenCajero, { items: [{ productoId: id, cantidad: 2 }] })).status,
      201
    );

    // Actual: fondo + efectivo, con reparto por empleado
    const actual = await req("GET", "/caja/actual", tokenJefe);
    assert.equal(actual.body.esperado, 250000, "fondo $500 + ventas $2.000");
    assert.equal(actual.body.turno.abiertoPor?.nombre, "Jefe");
    const cajero = (actual.body.porEmpleado as any[]).find((e) => e.nombre === "Cajero");
    assert.ok(cajero, "el cajero aparece en el reparto");
    assert.equal(cajero.total, 200000);
    assert.equal(cajero.ventas, 1);

    // Cierre: cuadra, enlaza el turno y lo cierra
    const cierre = await req("POST", "/caja/cerrar", tokenCajero, { contado: 250000 });
    assert.equal(cierre.status, 201);
    assert.equal(cierre.body.diferencia, 0);
    assert.ok(cierre.body.turnoId, "el arqueo queda enlazado al turno");

    const turnos = await req("GET", "/turnos/actual", tokenJefe);
    assert.equal(turnos.body.turno, null, "ya no hay turno abierto");

    // Se puede abrir el siguiente
    assert.equal((await req("POST", "/turnos/abrir", tokenCajero, {})).status, 201);
  });
});

describe("Más vendidos", () => {
  it("ordena por unidades vendidas en la ventana y aísla por negocio", async () => {
    const N = await crearNegocio("top");
    const mk = (nombre: string) =>
      req("POST", "/productos", N.token, {
        nombre,
        precioCompra: 1000,
        precioVenta: 2000,
        stockActual: 10,
      });
    const a = (await mk("Top A")).body;
    const b = (await mk("Top B")).body;
    assert.equal((await req("POST", "/ventas", N.token, { items: [{ productoId: a.id, cantidad: 3 }] })).status, 201);
    assert.equal((await req("POST", "/ventas", N.token, { items: [{ productoId: b.id, cantidad: 1 }] })).status, 201);

    const r = await req("GET", "/productos/mas-vendidos?limite=8", N.token);
    assert.equal(r.status, 200);
    assert.equal((r.body as any[])[0].id, a.id, "el más vendido va primero");
    assert.equal((r.body as any[])[0].vendidos, 3);
    assert.equal((r.body as any[])[1].id, b.id);

    const M = await crearNegocio("top-otro");
    const r2 = await req("GET", "/productos/mas-vendidos", M.token);
    assert.deepEqual(r2.body, [], "sin ventas no hay favoritos (ni datos ajenos)");
  });
});

describe("Estancados", () => {
  it("detecta stock sin rotación con su valor inmovilizado", async () => {
    const N = await crearNegocio("estancado");
    const mk = (nombre: string, stock: number) =>
      req("POST", "/productos", N.token, {
        nombre,
        precioCompra: 100000, // $1.000
        precioVenta: 200000,
        stockActual: stock,
      });
    const quieto = (await mk("Quieto", 4)).body;
    const mueve = (await mk("Mueve", 10)).body;
    await mk("SinStock", 0);
    assert.equal(
      (await req("POST", "/ventas", N.token, { items: [{ productoId: mueve.id, cantidad: 2 }] })).status,
      201
    );

    const r = await req("GET", "/productos/estancados", N.token);
    assert.equal(r.status, 200);
    const nombres = (r.body.items as any[]).map((i) => i.nombre);
    assert.ok(nombres.includes("Quieto"), "el sin rotación aparece");
    assert.ok(!nombres.includes("Mueve"), "el que se vende no aparece");
    assert.ok(!nombres.includes("SinStock"), "sin stock no inmoviliza plata");
    assert.equal(r.body.totalValor, 400000, "4 unidades x $1.000");
    assert.equal(
      (r.body.items as any[]).find((i) => i.nombre === "Quieto").ultimaVenta,
      null,
      "nunca vendido"
    );
  });
});

describe("Idempotencia de gastos", () => {
  it("reenviar la misma clave devuelve el gasto original sin duplicar", async () => {
    const N = await crearNegocio("gasto-idem");
    const body = { concepto: "Luz", monto: 50000, idempotenciaKey: "gasto-key-0001" };

    const r1 = await req("POST", "/gastos", N.token, body);
    assert.equal(r1.status, 201);

    const r2 = await req("POST", "/gastos", N.token, body);
    assert.equal(r2.status, 200, "el reintento debe reconocer la clave");
    assert.equal(r2.body.id, r1.body.id, "debe devolver el mismo gasto");

    const lista = await req("GET", "/gastos", N.token);
    assert.equal(
      (lista.body as any[]).filter((g) => g.concepto === "Luz").length,
      1,
      "no se duplica"
    );
  });
});

describe("Fecha de agregado", () => {
  it("usa la fecha actual si no se indica, y respeta la indicada", async () => {
    const N = await crearNegocio("agregado");
    const base = { precioCompra: 1000, precioVenta: 2000, stockActual: 1 };

    const sinFecha = await req("POST", "/productos", N.token, { nombre: "Sin fecha", ...base });
    assert.equal(sinFecha.status, 201);
    const hoy = new Date().toISOString().slice(0, 10);
    assert.equal(
      String(sinFecha.body.fechaAgregado).slice(0, 10),
      hoy,
      "sin fecha indicada queda la actual"
    );

    const conFecha = await req("POST", "/productos", N.token, {
      nombre: "Con fecha",
      fechaAgregado: "2026-01-15",
      ...base,
    });
    assert.equal(conFecha.status, 201);
    assert.equal(String(conFecha.body.fechaAgregado).slice(0, 10), "2026-01-15");

    const mala = await req("POST", "/productos", N.token, {
      nombre: "Mala fecha",
      fechaAgregado: "15-01-2026",
      ...base,
    });
    assert.equal(mala.status, 400, "el formato debe ser AAAA-MM-DD");
  });
});

describe("Conteo físico", () => {
  it("ajusta solo las diferencias, las firma y devuelve el resumen en plata", async () => {
    const N = await crearNegocio("conteo");
    const mk = (nombre: string, stock: number) =>
      req("POST", "/productos", N.token, {
        nombre,
        precioCompra: 100000, // $1.000
        precioVenta: 150000,
        stockActual: stock,
      });
    const a = (await mk("Conteo A", 10)).body;
    const b = (await mk("Conteo B", 5)).body;
    const c = (await mk("Conteo C", 3)).body;

    const r = await req("POST", "/conteos", N.token, {
      items: [
        { productoId: a.id, contado: 7 }, // faltan 3
        { productoId: b.id, contado: 6 }, // sobra 1
        { productoId: c.id, contado: 3 }, // igual
      ],
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.ajustados, 2, "solo genera movimientos por diferencias");
    assert.equal(r.body.sinCambios, 1);
    assert.equal(r.body.faltantesUnidades, 3);
    assert.equal(r.body.faltantesValor, 300000, "faltan 3 x $1.000");
    assert.equal(r.body.sobrantesUnidades, 1);

    // El stock queda en lo contado
    const check = await req("GET", "/productos?search=Conteo", N.token);
    const porNombre = new Map((check.body as any[]).map((p) => [p.nombre, p.stockActual]));
    assert.equal(porNombre.get("Conteo A"), 7);
    assert.equal(porNombre.get("Conteo B"), 6);

    // Los ajustes quedan firmados en el historial
    const movs = await req("GET", "/movimientos", N.token);
    const ajustes = (movs.body as any[]).filter((m) => m.tipo === "AJUSTE");
    assert.equal(ajustes.length, 2, "dos movimientos de ajuste");
    assert.ok(
      ajustes.every((m) => m.creadoPor?.nombre === "Dueño Test"),
      "cada ajuste queda firmado"
    );
  });

  it("rechaza productos de otro negocio y listas vacías", async () => {
    const A = await crearNegocio("conteo A");
    const B = await crearNegocio("conteo B");
    const prod = await req("POST", "/productos", B.token, {
      nombre: "Ajeno",
      precioCompra: 1000,
      precioVenta: 2000,
      stockActual: 5,
    });

    // A intenta contar un producto de B: no se aplica nada
    const cruce = await req("POST", "/conteos", A.token, {
      items: [{ productoId: prod.body.id, contado: 1 }],
    });
    assert.equal(cruce.status, 400);

    assert.equal((await req("POST", "/conteos", A.token, { items: [] })).status, 400);
    assert.equal(
      (
        await req("POST", "/conteos", A.token, {
          items: [
            { productoId: "x", contado: 1 },
            { productoId: "x", contado: 2 },
          ],
        })
      ).status,
      400,
      "rechaza duplicados"
    );
  });
});
