import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

// Lo que se puede hacer en el sistema. defaultStatements son los permisos del plugin
// admin (crear usuarios, cambiar roles, etc.), que solo tiene la gerencia
const todas = ["ver", "crear", "editar", "eliminar"] as const;

export const ac = createAccessControl({
  ...defaultStatements,
  inventario: todas,
  proveedores: todas,
  clientes: todas,
});

// Un rol por nivel del organigrama (src/data/equipo.ts)
export const roles = {
  gerencia: ac.newRole({
    ...adminAc.statements,
    inventario: ["ver", "crear", "editar", "eliminar"],
    proveedores: ["ver", "crear", "editar", "eliminar"],
    clientes: ["ver", "crear", "editar", "eliminar"],
  }),
  jefatura: ac.newRole({
    inventario: ["ver", "crear", "editar"],
    proveedores: ["ver", "crear", "editar"],
  }),
  personal: ac.newRole({
    inventario: ["ver"],
    proveedores: ["ver"],
  }),
  // Quien trae a su mascota: solo entra a su propio panel, sin nada del sistema interno
  cliente: ac.newRole({
    ...userAc.statements,
  }),
};

export type Rol = keyof typeof roles;

// Cómo se muestra cada rol en el sidebar y en Mi cuenta
export const nombreRol: Record<Rol, string> = {
  gerencia: "Gerencia",
  jefatura: "Jefatura",
  personal: "Personal",
  cliente: "Cliente",
};

// Lo que su rol le deja hacer en una sección, p. ej. acciones(user.role, "inventario")
export const acciones = (
  rol: string | null | undefined,
  seccion: "inventario" | "proveedores" | "clientes",
): readonly string[] => {
  // Cada rol declara solo sus secciones (el cliente no tiene ninguna), por eso el tipo
  // de los permisos se amplía a un registro con secciones opcionales
  const permisos = roles[rol as Rol]?.statements as
    | Partial<Record<typeof seccion, readonly string[]>>
    | undefined;
  return permisos?.[seccion] ?? [];
};
