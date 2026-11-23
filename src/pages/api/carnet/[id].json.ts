import type { APIRoute } from "astro";
import { pool } from "../../../lib/db";
import {
  ahoraEnClinica,
  calcularPuntosVisitas,
  especies,
  estados,
  fechaCaducidadPuntos,
  MESES_CADUCIDAD_PUNTOS,
  nivelDePuntos,
  preciosServicio,
  puntosServicio,
  puntosVigentesEn,
  servicios,
} from "../../../lib/citas";
import { edad, fecha as fechaCorta, pesos } from "../../../lib/formato";
import type { MascotaCarnet, VisitaCarnet } from "../../../lib/pdf-carnet";
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

  const hoy = ahoraEnClinica().fecha;
  const resumen = calcularPuntosVisitas(visitas, hoy);
  const nivel = nivelDePuntos(resumen.vigentes);

  const mascotasEnriquecidas = mascotas.map((m) => {
    const visitasM = visitas.filter((v) => v.mascota_id === m.id && v.estado === "completada");
    const puntosM = visitasM
      .filter((v) => puntosVigentesEn(v.fecha, hoy))
      .reduce((acc, v) => acc + puntosServicio[v.servicio], 0);
    return {
      id: m.id,
      nombre: m.nombre,
      especie: especies[m.especie],
      raza: m.raza,
      edad: m.nacimiento ? edad(m.nacimiento) : null,
      notas: m.notas,
      visitasCompletadas: visitasM.length,
      puntosVigentes: puntosM,
    };
  });

  const visitasEnriquecidas = visitas.map((v) => {
    const caducaIso = fechaCaducidadPuntos(v.fecha);
    const vigente = v.estado === "completada" ? puntosVigentesEn(v.fecha, hoy) : null;
    return {
      id: v.id,
      mascota_id: v.mascota_id,
      mascota: v.mascota,
      especie: especies[v.especie],
      fechaTexto: fechaCorta.format(new Date(`${v.fecha}T00:00:00Z`)),
      hora: v.hora,
      servicio: servicios[v.servicio],
      costo: pesos.format(preciosServicio[v.servicio]),
      motivo: v.motivo,
      estado: v.estado,
      estadoTexto: estados[v.estado],
      puntos: puntosServicio[v.servicio],
      vigente,
      caducaTexto: fechaCorta.format(new Date(`${caducaIso}T00:00:00Z`)),
    };
  });

  return new Response(
    JSON.stringify({
      id: cliente.id,
      folio: `VCH-${cliente.id.slice(0, 8).toUpperCase()}`,
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono,
      altaTexto: fechaCorta.format(new Date(cliente.alta)),
      mesesCaducidad: MESES_CADUCIDAD_PUNTOS,
      puntosVigentes: resumen.vigentes,
      puntosVencidos: resumen.vencidos,
      puntosEnCurso: resumen.enCurso,
      proximoVencimiento: resumen.proximoVencimiento
        ? {
            puntos: resumen.proximoVencimiento.puntos,
            fechaTexto: fechaCorta.format(
              new Date(`${resumen.proximoVencimiento.fecha}T00:00:00Z`),
            ),
          }
        : null,
      nivel,
      mascotas: mascotasEnriquecidas,
      visitas: visitasEnriquecidas,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
