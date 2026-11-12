// Horarios, servicios y estados de las citas. Lo usan las acciones (servidor) y los
// formularios (navegador), así que aquí no se importa nada del servidor. Si cambia el
// horario o una lista, hay que cambiar también los check de db/migraciones/004-...

// Las fechas y horas de las citas son las de la clínica
export const zonaClinica = "America/Mexico_City";

// Una cita cada 30 minutos desde que abre hasta media hora antes de cerrar
const apertura = 9 * 60;
const cierre = 16 * 60;
const intervalo = 30;

const dosDigitos = (n: number) => String(n).padStart(2, "0");

// "09:00", "09:30", …, "15:30"
export const horarios = Array.from(
  { length: (cierre - apertura) / intervalo },
  (_, i) => apertura + i * intervalo,
).map((minutos) => `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`) as [
  string,
  ...string[],
];

export const servicios = {
  consulta: "Consulta general",
  vacunacion: "Vacunación",
  desparasitacion: "Desparasitación",
  cirugia: "Cirugía y esterilización",
  laboratorio: "Laboratorio e imagen",
  estetica: "Estética y baño",
} as const;

export const estados = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
} as const;

export const especies = {
  perro: "Perro",
  gato: "Gato",
  ave: "Ave",
  roedor: "Roedor",
  reptil: "Reptil",
  otro: "Otro",
} as const;

export type Servicio = keyof typeof servicios;
export type Estado = keyof typeof estados;
export type Especie = keyof typeof especies;

export const claves = <T extends Record<string, string>>(objeto: T) =>
  Object.keys(objeto) as [keyof T & string, ...(keyof T & string)[]];

// Hoy y la hora actual en la clínica, como "2026-11-11" y "08:45"
export const ahoraEnClinica = () => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zonaClinica,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
};
