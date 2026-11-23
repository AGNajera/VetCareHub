// Horarios, servicios y estados de las citas. Lo usan las acciones (servidor), los
// formularios (navegador) y la sección pública de servicios, así que aquí no se importa
// nada del servidor. Si cambia el horario o una lista, hay que cambiar también los check
// de las migraciones en db/migraciones/

// Las fechas y horas de las citas son las de la clínica
export const zonaClinica = "America/Mexico_City";

// Una cita cada 30 minutos desde que abre hasta media hora antes de cerrar (19:00)
const apertura = 9 * 60;
const cierre = 19 * 60;
const intervalo = 30;

export const horaCierre = "19:00";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

// "09:00", "09:30", …, "18:30"
export const horarios = Array.from(
  { length: (cierre - apertura) / intervalo },
  (_, i) => apertura + i * intervalo,
).map((minutos) => `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`) as [
  string,
  ...string[],
];

// Catálogo de los 20 servicios de la clínica con su precio en MXN y descripción
export const catalogoServicios = {
  consulta: {
    nombre: "Consulta general",
    precio: 350,
    texto:
      "Revisión completa de nariz a cola, toma de signos vitales, diagnóstico y plan de cuidados por escrito.",
  },
  consulta_especialidad: {
    nombre: "Consulta de especialidad",
    precio: 600,
    texto:
      "Valoración en dermatología, oftalmología, ortopedia o cardiología para casos que requieren atención específica.",
  },
  urgencias: {
    nombre: "Atención de urgencias",
    precio: 800,
    texto:
      "Estabilización inmediata, oxigenoterapia y control del dolor para accidentes, intoxicaciones o crisis agudas.",
  },
  vacunacion: {
    nombre: "Vacunación",
    precio: 380,
    texto:
      "Esquemas para cachorros y adultos. Anotamos cada dosis en su cartilla y te avisamos cuándo toca la siguiente.",
  },
  desparasitacion: {
    nombre: "Desparasitación interna y externa",
    precio: 250,
    texto:
      "Control de parásitos intestinales, pulgas, garrapatas y ácaros según el peso y estilo de vida de tu mascota.",
  },
  esterilizacion: {
    nombre: "Esterilización",
    precio: 1800,
    texto:
      "Ovariohisterectomía u orquiectomía con anestesia inhalada, monitoreo continuo y medicación inicial para casa.",
  },
  cirugia: {
    nombre: "Cirugía de tejidos blandos",
    precio: 3500,
    texto:
      "Retiro de masas, cuerpos extraños, hernias o cesáreas en quirófano propio con monitoreo multiparamétrico.",
  },
  limpieza_dental: {
    nombre: "Limpieza dental por ultrasonido",
    precio: 1600,
    texto:
      "Profilaxis bajo sedación segura para retirar sarro, pulir el esmalte y desinflamar las encías.",
  },
  laboratorio: {
    nombre: "Biometría hemática y química sanguínea",
    precio: 900,
    texto:
      "Análisis de sangre en nuestro laboratorio para revisar defensas, hígado, riñones y glucosa el mismo día.",
  },
  rayos_x: {
    nombre: "Radiografía digital",
    precio: 650,
    texto:
      "Estudio de rayos X de tórax, abdomen o extremidades para detectar fracturas, objetos tragados o problemas articulares.",
  },
  ultrasonido: {
    nombre: "Ultrasonido abdominal o gestacional",
    precio: 750,
    texto:
      "Revisión en tiempo real de órganos internos o seguimiento de embarazo sin dolor ni radiación.",
  },
  electrocardiograma: {
    nombre: "Electrocardiograma y presión arterial",
    precio: 700,
    texto:
      "Evaluación del ritmo cardiaco y la circulación, ideal antes de una anestesia o en mascotas mayores.",
  },
  citologia: {
    nombre: "Citología y raspado cutáneo",
    precio: 420,
    texto:
      "Análisis al microscopio de muestras de piel, oídos o bultos para identificar hongos, bacterias o ácaros.",
  },
  curaciones: {
    nombre: "Curación de heridas y retiro de puntos",
    precio: 300,
    texto:
      "Lavado antiséptico, cambio de vendajes, manejo de mordeduras o retiro de suturas después de una cirugía.",
  },
  fluidoterapia: {
    nombre: "Fluidoterapia y medicación intravenosa",
    precio: 550,
    texto:
      "Hidratación por vía venosa y aplicación de medicamentos para pacientes con vómito, diarrea o deshidratación.",
  },
  hospitalizacion: {
    nombre: "Hospitalización diurna",
    precio: 1100,
    texto:
      "Vigilancia médica continua en áreas separadas para perros y gatos, con reporte y fotos por WhatsApp.",
  },
  estetica: {
    nombre: "Baño y estética completa",
    precio: 450,
    texto:
      "Baño con agua tibia, secado, corte de pelo según su raza, limpieza de oídos y recorte de uñas.",
  },
  bano_medicado: {
    nombre: "Baño medicado dermatológico",
    precio: 520,
    texto:
      "Terapia tópica con shampoo dermatológico para aliviar alergias, infecciones por hongos, seborrea o dermatitis.",
  },
  microchip: {
    nombre: "Identificación con microchip",
    precio: 680,
    texto:
      "Colocación subcutánea de microchip con código único internacional y constancia de registro para su localización.",
  },
  certificado_viaje: {
    nombre: "Certificado médico de viaje",
    precio: 480,
    texto:
      "Revisión clínica y expedición del certificado oficial de buena salud para viajar en avión o autobús.",
  },
} as const;

export type Servicio = keyof typeof catalogoServicios;

export const servicios = Object.fromEntries(
  Object.entries(catalogoServicios).map(([clave, { nombre }]) => [clave, nombre]),
) as { [K in Servicio]: (typeof catalogoServicios)[K]["nombre"] };

export const preciosServicio = Object.fromEntries(
  Object.entries(catalogoServicios).map(([clave, { precio }]) => [clave, precio]),
) as { [K in Servicio]: (typeof catalogoServicios)[K]["precio"] };

// Cada cita completada suma en el carnet el 10% del precio del servicio en puntos,
// con una vigencia de 6 meses a partir de la fecha de la cita
export const MESES_CADUCIDAD_PUNTOS = 6;

export const puntosServicio = Object.fromEntries(
  Object.entries(catalogoServicios).map(([clave, { precio }]) => [clave, Math.round(precio * 0.1)]),
) as Record<Servicio, number>;

// Calcula la fecha exacta (YYYY-MM-DD) en que caducan los puntos de una cita (6 meses después)
export const fechaCaducidadPuntos = (fechaCita: string): string => {
  const [anio, mes, dia] = fechaCita.split("-").map(Number);
  const totalMeses = mes - 1 + MESES_CADUCIDAD_PUNTOS;
  const nuevoAnio = anio + Math.floor(totalMeses / 12);
  const nuevoMes = (totalMeses % 12) + 1;
  const ultimoDiaMes = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
  const nuevoDia = Math.min(dia, ultimoDiaMes);
  return `${nuevoAnio}-${dosDigitos(nuevoMes)}-${dosDigitos(nuevoDia)}`;
};

export const puntosVigentesEn = (fechaCita: string, hoy = ahoraEnClinica().fecha): boolean =>
  fechaCaducidadPuntos(fechaCita) >= hoy;

export const calcularPuntosVisitas = <
  T extends { fecha: string; servicio: Servicio; estado: Estado },
>(
  visitas: readonly T[],
  hoy = ahoraEnClinica().fecha,
) => {
  let vigentes = 0;
  let vencidos = 0;
  let enCurso = 0;
  const porCaducar = new Map<string, number>();

  for (const v of visitas) {
    const pts = puntosServicio[v.servicio] ?? 0;
    if (v.estado === "completada") {
      const caduca = fechaCaducidadPuntos(v.fecha);
      if (caduca >= hoy) {
        vigentes += pts;
        porCaducar.set(caduca, (porCaducar.get(caduca) ?? 0) + pts);
      } else {
        vencidos += pts;
      }
    } else if (v.estado === "pendiente" || v.estado === "confirmada") {
      enCurso += pts;
    }
  }

  const fechasOrdenadas = [...porCaducar.keys()].sort();
  const proximaFecha = fechasOrdenadas[0] ?? null;
  const proximoVencimiento = proximaFecha
    ? { fecha: proximaFecha, puntos: porCaducar.get(proximaFecha)! }
    : null;

  return {
    vigentes,
    vencidos,
    enCurso,
    proximoVencimiento,
  };
};

export const nivelesCarnet = [
  {
    clave: "inicial",
    nombre: "Huella Inicial",
    minimo: 0,
    siguiente: 100,
    beneficio: "Carnet digital activo y seguimiento de vacunas y consultas.",
  },
  {
    clave: "bronce",
    nombre: "Huella Bronce",
    minimo: 100,
    siguiente: 250,
    beneficio: "5% de descuento en baño, estética completa y baño medicado.",
  },
  {
    clave: "plata",
    nombre: "Huella Plata",
    minimo: 250,
    siguiente: 500,
    beneficio: "10% de descuento en consulta general y desparasitación.",
  },
  {
    clave: "oro",
    nombre: "Huella Oro",
    minimo: 500,
    siguiente: null,
    beneficio: "15% de descuento en consultas, estética y estudios de laboratorio.",
  },
] as const;

export const nivelDePuntos = (puntos: number) => {
  const actual =
    [...nivelesCarnet].reverse().find((nivel) => puntos >= nivel.minimo) ?? nivelesCarnet[0];
  if (actual.siguiente === null) {
    return { ...actual, faltan: 0, progreso: 100 };
  }
  const tramo = actual.siguiente - actual.minimo;
  const avance = Math.min(tramo, Math.max(0, puntos - actual.minimo));
  return {
    ...actual,
    faltan: actual.siguiente - puntos,
    progreso: Math.round((avance / tramo) * 100),
  };
};

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
