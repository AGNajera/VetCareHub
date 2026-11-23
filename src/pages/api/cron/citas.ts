import type { APIRoute } from "astro";
import { ejecutarCierreDiarioCitas } from "../../../lib/cron-citas";
import { acciones } from "../../../lib/permisos";

export const prerender = false;

// Endpoint del Cron Job diario de las 19:00 h (cierre de la veterinaria).
// Lo invoca automáticamente Vercel Cron a las 19:00 America/Mexico_City (01:00 UTC)
// o el personal con permiso de editar citas desde el panel
const autorizado = (request: Request, rolUsuario: string | null | undefined) => {
  if (rolUsuario && acciones(rolUsuario, "citas").includes("editar")) return true;
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return true;
  return request.headers.get("authorization") === `Bearer ${secreto}`;
};

export const GET: APIRoute = async ({ request, locals }) => {
  if (!autorizado(request, locals.user?.role)) {
    return new Response(JSON.stringify({ ok: false, error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resultado = await ejecutarCierreDiarioCitas();
  return new Response(JSON.stringify({ ok: true, ...resultado }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export const POST: APIRoute = GET;
