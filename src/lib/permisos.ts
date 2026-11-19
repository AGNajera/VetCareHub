import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Lo que se puede hacer en el sistema. defaultStatements son los permisos del plugin
// admin (crear usuarios, cambiar roles, etc.), que solo tiene la gerencia
const todas = ["ver", "crear", "editar", "eliminar"] as const;

export const ac = createAccessControl({
  ...defaultStatements,
  inventario: todas,
  proveedores: todas,
  clientes: todas,
  citas: todas,
});

// Un rol por nivel del organigrama (src/data/equipo.ts), más el de los clientes.
// Todo el personal registra clientes y agenda y corrige citas (las citas no se borran:
// se cancelan)
export const roles = {
  gerencia: ac.newRole({
    ...adminAc.statements,
    inventario: ["ver", "crear", "editar", "eliminar"],
    proveedores: ["ver", "crear", "editar", "eliminar"],
    clientes: ["ver", "crear", "editar", "eliminar"],
    citas: ["ver", "crear", "editar"],
  }),
  jefatura: ac.newRole({
    inventario: ["ver", "crear", "editar"],
    proveedores: ["ver", "crear", "editar"],
    clientes: ["ver", "crear", "editar", "eliminar"],
    citas: ["ver", "crear", "editar"],
  }),
  personal: ac.newRole({
    inventario: ["ver"],
    proveedores: ["ver"],
    clientes: ["ver", "crear", "editar", "eliminar"],
    citas: ["ver", "crear", "editar"],
  }),
  // Los clientes no entran a /dashboard: tienen su panel en /cliente, donde solo ven y
  // cambian sus mascotas y sus citas (src/actions/index.ts lo revisa con su id)
  cliente: ac.newRole({}),
};

export type Rol = keyof typeof roles;
export type Seccion = "inventario" | "proveedores" | "clientes" | "citas";

// Cómo se muestra cada rol en el sidebar y en Mi cuenta
export const nombreRol: Record<Rol, string> = {
  gerencia: "Gerencia",
  jefatura: "Jefatura",
  personal: "Personal",
  cliente: "Cliente",
};

export const esCliente = (rol: string | null | undefined) => rol === "cliente";

// A dónde va cada quien al entrar: el personal al dashboard y los clientes a su panel
export const inicioDe = (rol: string | null | undefined) => (esCliente(rol) ? "/cliente" : "/dashboard");

// Lo que su rol le deja hacer en una sección, p. ej. acciones(user.role, "inventario")
export const acciones = (rol: string | null | undefined, seccion: Seccion) =>
  (roles[rol as Rol]?.statements[seccion as keyof (typeof roles)[Rol]["statements"]] ??
    []) as readonly string[];
