import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { pool } from "../lib/db";
import { acciones } from "../lib/permisos";

// Lo que cambia el inventario y los proveedores. Cada acción revisa en el servidor que el
// rol de quien la pide tenga el permiso (src/lib/permisos.ts); los botones que se ocultan
// en la página son solo para no ofrecer lo que no se puede hacer

const exigir = (
  { locals }: ActionAPIContext,
  seccion: "inventario" | "proveedores",
  accion: string,
) => {
  if (!locals.user) throw new ActionError({ code: "UNAUTHORIZED" });
  if (!acciones(locals.user.role, seccion).includes(accion)) {
    throw new ActionError({ code: "FORBIDDEN", message: "Tu rol no puede hacer esto." });
  }
};

// Los mensajes que no se escriben a mano, también en español
z.config(z.locales.es());

// Astro manda los campos vacíos de un formulario como null; uno con solo espacios llega
// como "". En la base los dos van como null
const opcional = z
  .string()
  .trim()
  .nullish()
  .transform((valor) => valor || null);

const categorias = ["medicamento", "vacuna", "material", "alimento", "higiene"] as const;

export const server = {
  inventario: {
    crear: defineAction({
      accept: "form",
      input: z.object({
        nombre: z.string().trim().min(1, "Escribe el nombre del producto."),
        categoria: z.enum(categorias, "Elige una categoría."),
        unidad: z.string().trim().min(1, "Escribe cómo se cuenta: pieza, caja, frasco…"),
        cantidad: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
        stock_minimo: z.coerce.number().int().min(0, "El mínimo no puede ser negativo."),
        precio: z.coerce.number().min(0, "El precio no puede ser negativo."),
        caducidad: opcional,
        proveedor_id: opcional.pipe(z.uuid().nullable()),
      }),
      handler: async (producto, context) => {
        exigir(context, "inventario", "crear");
        await pool.query(
          `insert into inventario
             (nombre, categoria, unidad, cantidad, stock_minimo, precio, caducidad, proveedor_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            producto.nombre,
            producto.categoria,
            producto.unidad,
            producto.cantidad,
            producto.stock_minimo,
            producto.precio,
            producto.caducidad,
            producto.proveedor_id,
          ],
        );
      },
    }),

    // Suma o resta una pieza. Se hace en la base (cantidad + 1) y no con el número que
    // tiene la página, por si dos personas lo cambian al mismo tiempo
    ajustar: defineAction({
      input: z.object({ id: z.uuid(), cambio: z.union([z.literal(1), z.literal(-1)]) }),
      handler: async ({ id, cambio }, context) => {
        exigir(context, "inventario", "editar");
        const { rows } = await pool.query<{ cantidad: number; stock_minimo: number }>(
          `update inventario
           set cantidad = cantidad + $2, actualizado_en = now()
           where id = $1 and activo and cantidad + $2 >= 0
           returning cantidad, stock_minimo`,
          [id, cambio],
        );
        if (!rows[0]) {
          throw new ActionError({ code: "BAD_REQUEST", message: "Ya no quedan existencias." });
        }
        return rows[0];
      },
    }),

    activar: defineAction({
      input: z.object({ id: z.uuid(), activo: z.boolean() }),
      handler: async ({ id, activo }, context) => {
        exigir(context, "inventario", "editar");
        await pool.query(
          "update inventario set activo = $2, actualizado_en = now() where id = $1",
          [id, activo],
        );
      },
    }),
  },

  proveedores: {
    // Crea uno nuevo o, si trae id, edita ese
    guardar: defineAction({
      accept: "form",
      input: z.object({
        id: opcional.pipe(z.uuid().nullable()),
        nombre: z.string().trim().min(1, "Escribe el nombre del proveedor."),
        razon_social: opcional,
        rfc: opcional
          .transform((rfc) => rfc?.toUpperCase() ?? null)
          .pipe(
            z
              .string()
              .regex(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/, "El RFC no tiene el formato correcto.")
              .nullable(),
          ),
        contacto: opcional,
        telefono: opcional,
        correo: opcional.pipe(z.email("El correo no es válido.").nullable()),
        direccion: opcional,
        ciudad: opcional,
        estado: opcional,
        codigo_postal: opcional.pipe(
          z.string().regex(/^[0-9]{5}$/, "El código postal lleva 5 números.").nullable(),
        ),
        dias_credito: z.coerce.number().int().min(0, "Los días de crédito no pueden ser negativos."),
        sitio_web: opcional,
      }),
      handler: async ({ id, ...p }, context) => {
        exigir(context, "proveedores", id ? "editar" : "crear");
        const valores = [
          p.nombre,
          p.razon_social,
          p.rfc,
          p.contacto,
          p.telefono,
          p.correo,
          p.direccion,
          p.ciudad,
          p.estado,
          p.codigo_postal,
          p.dias_credito,
          p.sitio_web,
        ];
        try {
          if (id) {
            await pool.query(
              `update proveedores set
                 nombre = $2, razon_social = $3, rfc = $4, contacto = $5, telefono = $6,
                 correo = $7, direccion = $8, ciudad = $9, estado = $10, codigo_postal = $11,
                 dias_credito = $12, sitio_web = $13, actualizado_en = now()
               where id = $1`,
              [id, ...valores],
            );
          } else {
            await pool.query(
              `insert into proveedores
                 (nombre, razon_social, rfc, contacto, telefono, correo, direccion, ciudad,
                  estado, codigo_postal, dias_credito, sitio_web)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              valores,
            );
          }
        } catch (error) {
          // 23505: ya hay otro proveedor con ese nombre (la columna es unique)
          if ((error as { code?: string }).code === "23505") {
            throw new ActionError({
              code: "CONFLICT",
              message: `Ya hay un proveedor que se llama ${p.nombre}.`,
            });
          }
          throw error;
        }
      },
    }),

    // Sus productos se quedan en el inventario, sin proveedor (on delete set null)
    borrar: defineAction({
      input: z.object({ id: z.uuid() }),
      handler: async ({ id }, context) => {
        exigir(context, "proveedores", "eliminar");
        await pool.query("delete from proveedores where id = $1", [id]);
      },
    }),
  },
};
