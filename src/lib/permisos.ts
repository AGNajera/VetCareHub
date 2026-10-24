import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Lo que se puede hacer en el sistema. defaultStatements son los permisos del plugin
// admin (crear usuarios, cambiar roles, etc.), que solo tiene la gerencia
const acciones = ["ver", "crear", "editar", "eliminar"] as const;

export const ac = createAccessControl({
  ...defaultStatements,
  inventario: acciones,
  proveedores: acciones,
});

// Un rol por nivel del organigrama (src/data/equipo.ts)
export const roles = {
  gerencia: ac.newRole({
    ...adminAc.statements,
    inventario: ["ver", "crear", "editar", "eliminar"],
    proveedores: ["ver", "crear", "editar", "eliminar"],
  }),
  jefatura: ac.newRole({
    inventario: ["ver", "crear", "editar"],
    proveedores: ["ver", "crear", "editar"],
  }),
  personal: ac.newRole({
    inventario: ["ver"],
    proveedores: ["ver"],
  }),
};
