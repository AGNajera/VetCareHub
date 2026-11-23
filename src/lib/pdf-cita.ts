import {
  especies,
  estados,
  preciosServicio,
  servicios,
  type Especie,
  type Estado,
  type Servicio,
} from "./citas";
import { pesos } from "./formato";

export type DatosCitaPdf = {
  id: string;
  mascota: string;
  especie: Especie;
  fecha: string;
  hora: string;
  servicio: Servicio;
  motivo: string | null;
  estado: Estado;
  creado_en: Date;
  cliente: string;
  correo: string;
  telefono: string | null;
};

// Alto y ancho de una hoja tamaño carta en puntos (72 puntos por pulgada)
const ANCHO = 612;
const ALTO = 792;
const MARGEN = 48;

// En PDF el origen (0, 0) está abajo a la izquierda; esta función convierte desde arriba
const y = (arriba: number) => +(ALTO - arriba).toFixed(2);
const n = (valor: number) => +valor.toFixed(2);

// Mapa de caracteres de Windows-1252 fuera de ISO-8859-1 que pueden aparecer en textos
const win1252: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x2122: 0x99,
};

// Convierte un texto a una cadena literal de PDF en WinAnsiEncoding usando solo ASCII
// (escapes octales \ddd para acentos y eñes), para que el largo en bytes nunca varíe
const cadenaPdf = (texto: string) => {
  let salida = "(";
  for (const char of texto) {
    const code = char.codePointAt(0)!;
    if (char === "\\" || char === "(" || char === ")") {
      salida += `\\${char}`;
    } else if (code >= 0x20 && code <= 0x7e) {
      salida += char;
    } else {
      const byte = win1252[code] ?? (code >= 0xa0 && code <= 0xff ? code : 0x3f);
      salida += `\\${byte.toString(8).padStart(3, "0")}`;
    }
  }
  return `${salida})`;
};

// Parte un texto en renglones para que no se salga de su caja
const partirTexto = (texto: string, maxCaracteres: number, maxLineas = 3) => {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  const lineas: string[] = [];
  let actual = "";
  let truncado = false;

  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    if (candidato.length <= maxCaracteres) {
      actual = candidato;
    } else if (!actual) {
      actual = `${palabra.slice(0, maxCaracteres - 1)}…`;
      if (lineas.length === maxLineas - 1) {
        truncado = true;
        break;
      }
      lineas.push(actual);
      actual = "";
    } else if (lineas.length === maxLineas - 1) {
      truncado = true;
      break;
    } else {
      lineas.push(actual);
      actual =
        palabra.length > maxCaracteres ? `${palabra.slice(0, maxCaracteres - 1)}…` : palabra;
    }
  }

  if (actual) {
    if (truncado && !actual.endsWith("…")) {
      actual =
        actual.length >= maxCaracteres ? `${actual.slice(0, maxCaracteres - 1)}…` : `${actual}…`;
    }
    lineas.push(actual);
  }
  return lineas;
};

// Rectángulo con esquinas redondeadas usando curvas de Bézier
const rectRedondeado = (
  x: number,
  arriba: number,
  ancho: number,
  alto: number,
  radio: number,
  modo: "f" | "S" | "B",
) => {
  const r = Math.min(radio, ancho / 2, alto / 2);
  const k = r * 0.55228475;
  const x0 = n(x);
  const x1 = n(x + ancho);
  const y0 = y(arriba + alto);
  const y1 = y(arriba);

  return [
    `${n(x0 + r)} ${y1} m`,
    `${n(x1 - r)} ${y1} l`,
    `${n(x1 - r + k)} ${y1} ${x1} ${n(y1 - r + k)} ${x1} ${n(y1 - r)} c`,
    `${x1} ${n(y0 + r)} l`,
    `${x1} ${n(y0 + r - k)} ${n(x1 - r + k)} ${y0} ${n(x1 - r)} ${y0} c`,
    `${n(x0 + r)} ${y0} l`,
    `${n(x0 + r - k)} ${y0} ${x0} ${n(y0 + r - k)} ${x0} ${n(y0 + r)} c`,
    `${x0} ${n(y1 - r)} l`,
    `${x0} ${n(y1 - r + k)} ${n(x0 + r - k)} ${y1} ${n(x0 + r)} ${y1} c`,
    `h ${modo}`,
  ].join("\n");
};

// Elipse rotada (para los deditos de la huella del logo de VetCareHub)
const elipseRotada = (cx: number, cy: number, rx: number, ry: number, grados: number) => {
  const rad = (grados * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const k = 0.55228475;
  const pt = (dx: number, dy: number) => {
    const px = cx + dx * cos - dy * sin;
    const py = cy + dx * sin + dy * cos;
    return `${n(px)} ${y(py)}`;
  };
  return [
    `${pt(0, -ry)} m`,
    `${pt(rx * k, -ry)} ${pt(rx, -ry * k)} ${pt(rx, 0)} c`,
    `${pt(rx, ry * k)} ${pt(rx * k, ry)} ${pt(0, ry)} c`,
    `${pt(-rx * k, ry)} ${pt(-rx, ry * k)} ${pt(-rx, 0)} c`,
    `${pt(-rx, -ry * k)} ${pt(-rx * k, -ry)} ${pt(0, -ry)} c`,
    "h f",
  ].join("\n");
};

// Dibuja el logo de VetCareHub (src/assets/logo.svg) escalado a `tam` puntos
const dibujarLogo = (x: number, arriba: number, tam: number) => {
  const s = tam / 120;
  const px = (vx: number) => n(x + vx * s);
  const py = (vy: number) => y(arriba + vy * s);

  return [
    "0 g",
    elipseRotada(x + 28 * s, arriba + 50 * s, 11 * s, 14 * s, -22),
    elipseRotada(x + 47 * s, arriba + 30 * s, 11 * s, 15 * s, -8),
    elipseRotada(x + 73 * s, arriba + 30 * s, 11 * s, 15 * s, 8),
    elipseRotada(x + 92 * s, arriba + 50 * s, 11 * s, 14 * s, 22),
    `${px(60)} ${py(106)} m`,
    `${px(37)} ${py(91)} ${px(28)} ${py(78)} ${px(28)} ${py(67)} c`,
    `${px(28)} ${py(56)} ${px(36)} ${py(49)} ${px(45)} ${py(49)} c`,
    `${px(52)} ${py(49)} ${px(57)} ${py(52)} ${px(60)} ${py(57)} c`,
    `${px(63)} ${py(52)} ${px(68)} ${py(49)} ${px(75)} ${py(49)} c`,
    `${px(84)} ${py(49)} ${px(92)} ${py(56)} ${px(92)} ${py(67)} c`,
    `${px(92)} ${py(78)} ${px(83)} ${py(91)} ${px(60)} ${py(106)} c`,
    "h f",
    // Cruz blanca en el centro
    "1 g",
    `${px(55)} ${py(64)} m`,
    `${px(65)} ${py(64)} l`,
    `${px(65)} ${py(73)} l`,
    `${px(74)} ${py(73)} l`,
    `${px(74)} ${py(83)} l`,
    `${px(65)} ${py(83)} l`,
    `${px(65)} ${py(92)} l`,
    `${px(55)} ${py(92)} l`,
    `${px(55)} ${py(83)} l`,
    `${px(46)} ${py(83)} l`,
    `${px(46)} ${py(73)} l`,
    `${px(55)} ${py(73)} l`,
    "h f",
  ].join("\n");
};

const texto = (
  fuente: "F1" | "F2",
  tam: number,
  x: number,
  arriba: number,
  contenido: string,
) => `BT /${fuente} ${tam} Tf ${n(x)} ${y(arriba)} Td ${cadenaPdf(contenido)} Tj ET`;

const fechaLarga = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const fechaEmision = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

const capitalizar = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const generarPdfCita = (cita: DatosCitaPdf): Uint8Array => {
  const anchoUtil = ANCHO - MARGEN * 2;
  const folio = cita.id.slice(0, 8).toUpperCase();
  const diaTexto = capitalizar(fechaLarga.format(new Date(`${cita.fecha}T00:00:00Z`)));
  const estadoTexto = estados[cita.estado];
  const especieTexto = especies[cita.especie];
  const servicioTexto = servicios[cita.servicio];
  const motivoLineas = partirTexto(cita.motivo || "Sin especificar", 76, 3);

  const anchoPastilla = estadoTexto.length * 7.2 + 24;
  const xPastilla = ANCHO - MARGEN - anchoPastilla;

  const ops: string[] = [
    // Encabezado con el logo y los datos de la clínica
    dibujarLogo(MARGEN, 44, 44),
    "0 g",
    "0 G",
    texto("F2", 20, MARGEN + 52, 65, "VetCareHub"),
    texto("F1", 10.5, MARGEN + 52, 81, "Clínica veterinaria · Cuernavaca, Morelos"),

    // Pastilla con el estado de la cita a la derecha (solo borde, sin relleno)
    "1 w",
    rectRedondeado(xPastilla, 50, anchoPastilla, 26, 13, "S"),
    texto("F2", 11, xPastilla + 13, 67, estadoTexto),

    // Línea divisoria del encabezado
    "1.5 w",
    `${MARGEN} ${y(104)} m ${ANCHO - MARGEN} ${y(104)} l S`,

    // Título y folio
    texto("F2", 22, MARGEN, 140, "Comprobante de cita"),
    texto(
      "F1",
      11,
      MARGEN,
      158,
      `Folio #${folio} · Registrada el ${fechaEmision.format(new Date(cita.creado_en))}`,
    ),

    // Tarjeta destacada con la fecha y la hora de la cita
    "1.2 w",
    rectRedondeado(MARGEN, 178, anchoUtil, 78, 10, "S"),
    texto("F2", 10, MARGEN + 20, 200, "FECHA DE LA CITA"),
    texto("F2", 10, MARGEN + 340, 200, "HORARIO"),
    texto("F2", 15, MARGEN + 20, 224, diaTexto),
    texto("F2", 18, MARGEN + 340, 225, `${cita.hora} h`),
    texto("F1", 10, MARGEN + 20, 242, "Horario de la clínica (Ciudad de México)"),
    texto("F1", 10, MARGEN + 340, 242, "Duración aproximada: 30 min"),

    // Bloque: Datos del paciente y servicio
    rectRedondeado(MARGEN, 276, anchoUtil, 200, 10, "S"),
    texto("F2", 13, MARGEN + 20, 300, "Datos de la mascota y servicio"),
    "0.6 w",
    `${MARGEN + 20} ${y(310)} m ${ANCHO - MARGEN - 20} ${y(310)} l S`,

    texto("F2", 10, MARGEN + 20, 330, "MASCOTA"),
    texto("F2", 10, MARGEN + 270, 330, "ESPECIE"),
    texto("F2", 14, MARGEN + 20, 348, cita.mascota),
    texto("F1", 13, MARGEN + 270, 348, especieTexto),

    texto("F2", 10, MARGEN + 20, 378, "SERVICIO"),
    texto("F2", 10, MARGEN + 380, 378, "PRECIO"),
    texto("F2", 13, MARGEN + 20, 396, servicioTexto),
    texto("F2", 13, MARGEN + 380, 396, `${pesos.format(preciosServicio[cita.servicio])} MXN`),

    texto("F2", 10, MARGEN + 20, 422, "MOTIVO O NOTAS"),
    ...motivoLineas.map((linea, i) => texto("F1", 11.5, MARGEN + 20, 438 + i * 14, linea)),

    // Bloque: Datos del cliente
    "1.2 w",
    rectRedondeado(MARGEN, 492, anchoUtil, 106, 10, "S"),
    texto("F2", 13, MARGEN + 20, 516, "Datos del cliente"),
    "0.6 w",
    `${MARGEN + 20} ${y(526)} m ${ANCHO - MARGEN - 20} ${y(526)} l S`,

    texto("F2", 10, MARGEN + 20, 546, "NOMBRE"),
    texto("F2", 10, MARGEN + 270, 546, "TELÉFONO"),
    texto("F2", 12.5, MARGEN + 20, 563, cita.cliente),
    texto("F1", 12, MARGEN + 270, 563, cita.telefono ?? "No registrado"),

    texto("F2", 10, MARGEN + 20, 584, "CORREO ELECTRÓNICO"),
    texto("F1", 11.5, MARGEN + 150, 584, cita.correo),

    // Bloque: Indicaciones para asistir
    "1.2 w",
    rectRedondeado(MARGEN, 614, anchoUtil, 82, 10, "S"),
    texto("F2", 11.5, MARGEN + 20, 636, "Indicaciones para tu visita"),
    texto("F1", 10.5, MARGEN + 20, 654, "• Por favor llega 10 minutos antes de tu hora programada."),
    texto(
      "F1",
      10.5,
      MARGEN + 20,
      670,
      "• Trae la cartilla de vacunación de tu mascota si ya cuenta con una.",
    ),
    texto(
      "F1",
      10.5,
      MARGEN + 20,
      686,
      "• Si necesitas cambiar o cancelar tu cita, puedes hacerlo desde tu panel en VetCareHub.",
    ),

    // Pie de página con datos de contacto de la clínica
    "0.6 w",
    `${MARGEN} ${y(720)} m ${ANCHO - MARGEN} ${y(720)} l S`,
    texto("F2", 10, MARGEN, 738, "VetCareHub · Av. Emiliano Zapata 123, Tlaltenango, Cuernavaca, Morelos"),
    texto("F1", 9.5, MARGEN, 753, "Tel. 777 123 4567 · vetcarehubmx@gmail.com · Atención de 9:00 a 19:00 h"),
  ];

  const contenido = ops.join("\n");
  const objetos = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`,
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj",
    `6 0 obj\n<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream\nendobj`,
    `7 0 obj\n<< /Title ${cadenaPdf(`Cita de ${cita.mascota} - VetCareHub`)} /Author (VetCareHub) >>\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const posiciones: number[] = [];
  for (const obj of objetos) {
    posiciones.push(pdf.length);
    pdf += `${obj}\n`;
  }

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const pos of posiciones) {
    pdf += `${String(pos).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
};
