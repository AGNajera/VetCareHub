import { pool } from "./db";
import { ahoraEnClinica, horaCierre, zonaClinica } from "./citas";

export type ResultadoCronCitas = {
  canceladas: number;
  ejecutadoEn: string;
  horarioProgramado: string;
  zona: string;
};

// Cancela todas las citas pendientes o confirmadas cuya fecha y hora asignada ya pasaron
// al momento de ejecutarse el corte (programado todos los días a las 19:00 h, cierre de la clínica)
export const ejecutarCierreDiarioCitas = async (): Promise<ResultadoCronCitas> => {
  const { rowCount } = await pool.query(
    `update citas
     set estado = 'cancelada', actualizado_en = now()
     where estado in ('pendiente', 'confirmada')
       and (fecha + hora) <= (now() at time zone 'America/Mexico_City')`,
  );

  const ahora = ahoraEnClinica();
  return {
    canceladas: rowCount ?? 0,
    ejecutadoEn: `${ahora.fecha} ${ahora.hora}`,
    horarioProgramado: `Diario a las ${horaCierre} h`,
    zona: zonaClinica,
  };
};

// Asegura que cualquier cita de días anteriores (o de hoy si ya dieron las 19:00 h) que haya
// quedado pendiente o confirmada al cierre de las 19:00 se cancele automáticamente, incluso si
// el servidor estuvo apagado a las 19:00
export const aplicarCorteDeCierre19h = async (): Promise<number> => {
  const { rowCount } = await pool.query(
    `update citas
     set estado = 'cancelada', actualizado_en = now()
     where estado in ('pendiente', 'confirmada')
       and (
         fecha < (now() at time zone 'America/Mexico_City')::date
         or (
           fecha = (now() at time zone 'America/Mexico_City')::date
           and (now() at time zone 'America/Mexico_City')::time >= time '19:00'
           and (fecha + hora) <= (now() at time zone 'America/Mexico_City')
         )
       )`,
  );
  return rowCount ?? 0;
};

// Calcula cuántos milisegundos faltan para las próximas 19:00:00 en horario de la clínica
export const msHastaProximoCierre19h = (ahora = new Date()): number => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zonaClinica,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(ahora)
      .map(({ type, value }) => [type, Number(value)]),
  );

  const segundosHoy = (partes.hour ?? 0) * 3600 + (partes.minute ?? 0) * 60 + (partes.second ?? 0);
  const segundosCierre = 19 * 3600;
  const faltanSegundos =
    segundosHoy < segundosCierre
      ? segundosCierre - segundosHoy
      : 24 * 3600 - segundosHoy + segundosCierre;

  return faltanSegundos * 1000;
};

// Programa el cron job en memoria para que en servidor continuo (dev / preview / node)
// se ejecute automáticamente todos los días exactamente a las 19:00 h
const globalCron = globalThis as unknown as { __vetcareCron19hIniciado?: boolean };

export const iniciarCronDiario19h = () => {
  if (globalCron.__vetcareCron19hIniciado) return;
  globalCron.__vetcareCron19hIniciado = true;

  const programarSiguiente = () => {
    const esperaMs = msHastaProximoCierre19h();
    const timer = setTimeout(async () => {
      try {
        await ejecutarCierreDiarioCitas();
      } catch (error) {
        console.error("[Cron 19:00] Error al cancelar citas vencidas:", error);
      } finally {
        programarSiguiente();
      }
    }, esperaMs);

    // No bloquea el cierre del proceso si se corre en un script
    if (typeof timer.unref === "function") timer.unref();
  };

  programarSiguiente();
};
