import type { APIRoute } from "astro";
import { pool } from "../../../lib/db";
import { normalizar } from "../../../lib/formato";
import { generarPdfCita, type DatosCitaPdf } from "../../../lib/pdf-cita";
import { acciones, esCliente } from "../../../lib/permisos";

export const prerender = false;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ params, locals }) => {
  const { user } = locals;
  if (!user) return new Response(null, { status: 401 });

  const cliente = esCliente(user.role) ? user.id : null;
  if (!cliente && !acciones(user.role, "citas").includes("ver")) {
    return new Response(null, { status: 403 });
  }

  const id = params.id;
  if (!id || !uuidRegex.test(id)) return new Response(null, { status: 404 });

  const { rows } = await pool.query<DatosCitaPdf>(
    `select c.id, c.mascota, c.especie, to_char(c.fecha, 'YYYY-MM-DD') as fecha,
            to_char(c.hora, 'HH24:MI') as hora, c.servicio, c.motivo, c.estado,
            c.creado_en, u.name as cliente, u.email as correo, u.telefono
     from citas c
     join "user" u on u.id = c.cliente_id
     where c.id = $1 and ($2::text is null or c.cliente_id = $2)`,
    [id, cliente],
  );

  const cita = rows[0];
  if (!cita) return new Response(null, { status: 404 });

  const mascota =
    normalizar(cita.mascota)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mascota";
  const archivo = `cita-${mascota}-${cita.fecha}.pdf`;

  return new Response(generarPdfCita(cita), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "no-store",
    },
  });
};
