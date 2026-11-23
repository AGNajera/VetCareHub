import type { APIRoute } from "astro";
import { pool } from "../../../lib/db";
import { normalizar } from "../../../lib/formato";
import {
  generarPdfCarnet,
  type MascotaCarnet,
  type VisitaCarnet,
} from "../../../lib/pdf-carnet";
import { acciones, esCliente } from "../../../lib/permisos";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { user } = locals;
  if (!user) return new Response(null, { status: 401 });

  const id = params.id;
  if (!id) return new Response(null, { status: 404 });

  if (esCliente(user.role)) {
    if (id !== user.id) return new Response(null, { status: 403 });
  } else if (!acciones(user.role, "historial").includes("ver")) {
    return new Response(null, { status: 403 });
  }

  const [{ rows: clientes }, { rows: mascotas }, { rows: visitas }] = await Promise.all([
    pool.query<{
      id: string;
      nombre: string;
      correo: string;
      telefono: string | null;
      alta: Date;
    }>(
      `select id, name as nombre, email as correo, telefono, "createdAt" as alta
       from "user"
       where id = $1 and role = 'cliente'`,
      [id],
    ),
    pool.query<MascotaCarnet>(
      `select id, nombre, especie, raza, to_char(nacimiento, 'YYYY-MM-DD') as nacimiento, notas
       from mascotas
       where cliente_id = $1
       order by nombre`,
      [id],
    ),
    pool.query<VisitaCarnet>(
      `select c.id, c.mascota_id, m.nombre as mascota, m.especie,
              to_char(c.fecha, 'YYYY-MM-DD') as fecha, to_char(c.hora, 'HH24:MI') as hora,
              c.servicio, c.motivo, c.estado
       from citas c
       join mascotas m on m.id = c.mascota_id
       where m.cliente_id = $1
       order by c.fecha desc, c.hora desc`,
      [id],
    ),
  ]);

  const cliente = clientes[0];
  if (!cliente) return new Response(null, { status: 404 });

  const slug =
    normalizar(cliente.nombre)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cliente";

  return new Response(
    generarPdfCarnet({
      ...cliente,
      mascotas,
      visitas,
    }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carnet-${slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    },
  );
};
