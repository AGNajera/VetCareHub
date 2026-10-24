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
