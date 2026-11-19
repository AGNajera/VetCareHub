import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { randomBytes } from "node:crypto";
import { APIError } from "better-auth/api";
import { auth } from "../lib/auth";
import { pool } from "../lib/db";
import { acciones, esCliente, type Seccion } from "../lib/permisos";
import { ahoraEnClinica, claves, especies, estados, horarios, servicios } from "../lib/citas";

// Lo que cambia el inventario, los proveedores, los clientes y las citas. Cada acción
// revisa en el servidor que el rol de quien la pide tenga el permiso (src/lib/permisos.ts);
// los botones que se ocultan en la página son solo para no ofrecer lo que no se puede hacer

const exigir = ({ locals }: ActionAPIContext, seccion: Seccion, accion: string) => {
  if (!locals.user) throw new ActionError({ code: "UNAUTHORIZED" });
  if (!acciones(locals.user.role, seccion).includes(accion)) {
    throw new ActionError({ code: "FORBIDDEN", message: "Tu rol no puede hacer esto." });
  }
};

// Las acciones de mascotas y citas las usan el personal y los clientes. Devuelve el id del
// cliente que la pide, o null si es del personal (y entonces revisa su permiso)
const clienteOPermiso = (context: ActionAPIContext, seccion: Seccion, accion: string) => {
  const { user } = context.locals;
  if (!user) throw new ActionError({ code: "UNAUTHORIZED" });
  if (esCliente(user.role)) return user.id;
  exigir(context, seccion, accion);
  return null;
};

// Contraseña al azar para las cuentas de clientes: 12 caracteres de letras, números, - y _
const passwordAlAzar = () => randomBytes(9).toString("base64url");

// 23505: se repitió un valor que la base no deja repetir (unique)
const esRepetido = (error: unknown) => (error as { code?: string }).code === "23505";

const horarioOcupado = () =>
  new ActionError({ code: "CONFLICT", message: "Ese horario ya está ocupado. Elige otro." });

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
          if (esRepetido(error)) {
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

  clientes: {
    // Crea la cuenta de un cliente o, si trae id, corrige sus datos. Al crearla se le da
    // una contraseña al azar, que se devuelve una sola vez para que se la pasen; luego él
    // la cambia en Mi cuenta
    guardar: defineAction({
      accept: "form",
      input: z.object({
        id: opcional,
        nombre: z.string().trim().min(1, "Escribe el nombre del cliente."),
        correo: z.string().trim().toLowerCase().pipe(z.email("El correo no es válido.")),
        telefono: opcional,
      }),
      handler: async ({ id, nombre, correo, telefono }, context) => {
        exigir(context, "clientes", id ? "editar" : "crear");
        const repetido = new ActionError({
          code: "CONFLICT",
          message: `Ya hay una cuenta con el correo ${correo}.`,
        });

        if (id) {
          try {
            const { rowCount } = await pool.query(
              `update "user" set name = $2, email = $3, telefono = $4, "updatedAt" = now()
               where id = $1 and role = 'cliente'`,
              [id, nombre, correo, telefono],
            );
            if (!rowCount) throw new ActionError({ code: "NOT_FOUND", message: "Ese cliente ya no existe." });
          } catch (error) {
            if (esRepetido(error)) throw repetido;
            throw error;
          }
          return { password: null };
        }

        const password = passwordAlAzar();
        try {
          // Sin headers: lo crea el servidor, ya revisado el permiso arriba
          await auth.api.createUser({
            body: { email: correo, password, name: nombre, role: "cliente", data: { telefono } },
          });
        } catch (error) {
          if (error instanceof APIError && error.status === "BAD_REQUEST") throw repetido;
          throw error;
        }
        return { password };
      },
    }),

    // Para cuando el cliente olvidó la suya: le da otra al azar y cierra sus sesiones
    nuevaPassword: defineAction({
      input: z.object({ id: z.string().min(1) }),
      handler: async ({ id }, context) => {
        exigir(context, "clientes", "editar");
        const { rowCount } = await pool.query(
          `select 1 from "user" where id = $1 and role = 'cliente'`,
          [id],
        );
        if (!rowCount) throw new ActionError({ code: "NOT_FOUND", message: "Ese cliente ya no existe." });

        const password = passwordAlAzar();
        const ctx = await auth.$context;
        await ctx.internalAdapter.updatePassword(id, await ctx.password.hash(password));
        await ctx.internalAdapter.deleteSessions(id);
        return { password };
      },
    }),
  },

  mascotas: {
    // Crea una nueva o, si trae id, edita esa. El cliente solo las suyas; el personal elige
    // de qué cliente es
    guardar: defineAction({
      accept: "form",
      input: z.object({
        id: opcional.pipe(z.uuid().nullable()),
        cliente_id: opcional,
        nombre: z.string().trim().min(1, "Escribe el nombre de la mascota."),
        especie: z.enum(claves(especies), "Elige la especie."),
        raza: opcional,
        nacimiento: opcional.pipe(z.iso.date("La fecha de nacimiento no es válida.").nullable()),
        notas: opcional,
      }),
      handler: async (m, context) => {
        const cliente = clienteOPermiso(context, "clientes", m.id ? "editar" : "crear");
        const duenio = cliente ?? m.cliente_id;
        if (!duenio) {
          throw new ActionError({ code: "BAD_REQUEST", message: "Elige de quién es la mascota." });
        }
        if (m.nacimiento && m.nacimiento > ahoraEnClinica().fecha) {
          throw new ActionError({ code: "BAD_REQUEST", message: "La fecha de nacimiento no puede ser futura." });
        }
        if (!cliente) {
          const { rowCount } = await pool.query(
            `select 1 from "user" where id = $1 and role = 'cliente'`,
            [duenio],
          );
          if (!rowCount) throw new ActionError({ code: "BAD_REQUEST", message: "Ese cliente ya no existe." });
        }

        const valores = [duenio, m.nombre, m.especie, m.raza, m.nacimiento, m.notas];
        if (m.id) {
          // Un cliente solo encuentra las suyas; el personal puede cambiarla de dueño
          const { rowCount } = await pool.query(
            `update mascotas set
               cliente_id = $2, nombre = $3, especie = $4, raza = $5, nacimiento = $6,
               notas = $7, actualizado_en = now()
             where id = $1 and ($8::text is null or cliente_id = $8)`,
            [m.id, ...valores, cliente],
          );
          if (!rowCount) throw new ActionError({ code: "NOT_FOUND", message: "Esa mascota ya no existe." });
        } else {
          await pool.query(
            `insert into mascotas (cliente_id, nombre, especie, raza, nacimiento, notas)
             values ($1, $2, $3, $4, $5, $6)`,
            valores,
          );
        }
      },
    }),
  },

  citas: {
    // Los horarios ya apartados de un día, para no ofrecerlos en el formulario. Solo las
    // horas: no dice de quién son. Al editar se excluye la cita que se está cambiando
    ocupadas: defineAction({
      input: z.object({ fecha: z.iso.date(), excluir: z.uuid().nullish() }),
      handler: async ({ fecha, excluir }, context) => {
        clienteOPermiso(context, "citas", "ver");
        const { rows } = await pool.query<{ hora: string }>(
          `select to_char(hora, 'HH24:MI') as hora from citas
           where fecha = $1 and estado <> 'cancelada' and ($2::uuid is null or id <> $2)`,
          [fecha, excluir ?? null],
        );
        return rows.map(({ hora }) => hora);
      },
    }),

    // Agenda una cita o, si trae id, la cambia. El personal puede corregir cualquier dato
    // (también el estado y fechas pasadas, por si se anotó mal). El cliente solo agenda para
    // sus mascotas, en horarios que no han pasado, y si cambia una cita vuelve a quedar
    // pendiente para que la clínica la confirme
    guardar: defineAction({
      accept: "form",
      input: z.object({
        id: opcional.pipe(z.uuid().nullable()),
        mascota_id: z.uuid("Elige la mascota."),
        fecha: z.iso.date("Elige la fecha."),
        hora: z.enum(horarios, "Elige un horario entre 9:00 y 15:30."),
        servicio: z.enum(claves(servicios), "Elige el servicio."),
        motivo: opcional,
        estado: opcional.pipe(z.enum(claves(estados)).nullable()),
      }),
      handler: async (c, context) => {
        const cliente = clienteOPermiso(context, "citas", c.id ? "editar" : "crear");

        if (cliente) {
          const ahora = ahoraEnClinica();
          if (`${c.fecha} ${c.hora}` <= `${ahora.fecha} ${ahora.hora}`) {
            throw new ActionError({ code: "BAD_REQUEST", message: "Elige un día y una hora que no hayan pasado." });
          }
          const { rowCount } = await pool.query(
            "select 1 from mascotas where id = $1 and cliente_id = $2",
            [c.mascota_id, cliente],
          );
          if (!rowCount) throw new ActionError({ code: "BAD_REQUEST", message: "Elige una de tus mascotas." });
        } else {
          const { rowCount } = await pool.query("select 1 from mascotas where id = $1", [c.mascota_id]);
          if (!rowCount) throw new ActionError({ code: "BAD_REQUEST", message: "Esa mascota ya no existe." });
        }

        const estado = cliente ? "pendiente" : (c.estado ?? "pendiente");
        const valores = [c.mascota_id, c.fecha, c.hora, c.servicio, c.motivo, estado];

        try {
          if (c.id) {
            // Un cliente solo cambia las suyas que siguen activas y no han pasado
            const { rowCount } = await pool.query(
              `update citas set
                 mascota_id = $2, fecha = $3, hora = $4, servicio = $5, motivo = $6,
                 estado = $7, actualizado_en = now()
               where id = $1
                 and ($8::text is null or (
                   estado in ('pendiente', 'confirmada')
                   and fecha + hora > (now() at time zone 'America/Mexico_City')
                   and mascota_id in (select id from mascotas where cliente_id = $8)
                 ))`,
              [c.id, ...valores, cliente],
            );
            if (!rowCount) {
              throw new ActionError({ code: "NOT_FOUND", message: "Esa cita ya no se puede cambiar." });
            }
          } else {
            await pool.query(
              `insert into citas (mascota_id, fecha, hora, servicio, motivo, estado)
               values ($1, $2, $3, $4, $5, $6)`,
              valores,
            );
          }
        } catch (error) {
          if (esRepetido(error)) throw horarioOcupado();
          throw error;
        }
      },
    }),

    // El cliente cancela una de sus citas que no ha pasado; su horario queda libre.
    // El personal cancela cambiando el estado al editar
    cancelar: defineAction({
      input: z.object({ id: z.uuid() }),
      handler: async ({ id }, context) => {
        const cliente = clienteOPermiso(context, "citas", "editar");
        const { rowCount } = await pool.query(
          `update citas set estado = 'cancelada', actualizado_en = now()
           where id = $1
             and estado in ('pendiente', 'confirmada')
             and ($2::text is null or (
               fecha + hora > (now() at time zone 'America/Mexico_City')
               and mascota_id in (select id from mascotas where cliente_id = $2)
             ))`,
          [id, cliente],
        );
        if (!rowCount) throw new ActionError({ code: "NOT_FOUND", message: "Esa cita ya no se puede cancelar." });
      },
    }),
  },
};
