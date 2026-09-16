import { api } from "@/lib/api-client";

/* Team data access (owner-only): list members, create employees, remove.

   Members carry a role ("DUENO" | "EMPLEADO"); only owners can invite/remove,
   enforced on the backend and mirrored by the (owner) route group guard. */

export type TeamMember = {
  id: string;
  nombre: string;
  email: string;
  rol: "DUENO" | "EMPLEADO";
};

export type CrearEmpleadoBody = { nombre: string; email: string; password: string };

export async function listarEquipo(): Promise<TeamMember[]> {
  return api<TeamMember[]>("/usuarios");
}

export async function crearEmpleado(body: CrearEmpleadoBody): Promise<unknown> {
  return api("/usuarios/empleados", { method: "POST", body: JSON.stringify(body) });
}

export async function eliminarMiembro(id: string): Promise<unknown> {
  return api(`/usuarios/${id}`, { method: "DELETE" });
}
