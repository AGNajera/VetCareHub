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
