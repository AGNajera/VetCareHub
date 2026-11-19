// Cómo se muestran las cantidades y fechas en el sistema
export const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
export const numero = new Intl.NumberFormat("es-MX");

// Las fechas de Postgres (date) llegan como Date a medianoche UTC; se muestran en UTC
// para que no se recorran un día en México
export const fecha = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// Para buscar sin importar mayúsculas ni acentos: "Vacuna Antirrábica" → "vacuna antirrabica"
export const normalizar = (texto: string) =>
  texto.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Edad aproximada a partir de una fecha ISO (YYYY-MM-DD)
export const edad = (nacimiento: string) => {
  const meses = Math.max(
    0,
    Math.floor((Date.now() - new Date(`${nacimiento}T00:00:00Z`).getTime()) / (30.44 * 864e5)),
  );
  if (meses === 0) return "Menos de 1 mes";
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anios = Math.floor(meses / 12);
  return `${anios} ${anios === 1 ? "año" : "años"}`;
};
