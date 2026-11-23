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
  type Especie,
  type Estado,
  type Servicio,
} from "./citas";
import { edad, fecha as fechaCorta, numero, pesos } from "./formato";

export type MascotaCarnet = {
  id: string;
  nombre: string;
  especie: Especie;
  raza: string | null;
  nacimiento: string | null;
  notas: string | null;
};

export type VisitaCarnet = {
  id: string;
  mascota_id: string;
  mascota: string;
  especie: Especie;
  fecha: string;
  hora: string;
  servicio: Servicio;
  motivo: string | null;
  estado: Estado;
};

export type DatosCarnet = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  alta: Date;
  mascotas: MascotaCarnet[];
  visitas: VisitaCarnet[];
};

const ANCHO = 612;
const ALTO = 792;
const MARGEN = 48;

const y = (arriba: number) => +(ALTO - arriba).toFixed(2);
const n = (valor: number) => +valor.toFixed(2);

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

const cortar = (texto: string, max: number) =>
  texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;

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

const elipseRotada = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  grados: number,
  modo: "f" | "S" | "B" = "f",
) => {
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
    `h ${modo}`,
  ].join("\n");
};

// Dibuja a Canela (la mascota de VetCareHub, src/assets/mascota.svg) en blanco y negro puro
// (solo contornos y tinta negra, sin colores) dentro de un recuadro redondeado de tamaño `tam`
const dibujarMascota = (x: number, arriba: number, tam: number) => {
  // Recortamos alrededor de Canela en el viewBox original (265..565 x 220..580)
  const s = tam / 340;
  const vx = (ox: number) => x + (ox - 230) * s;
  const vy = (oy: number) => arriba + (oy - 215) * s;

  return [
    "q",
    "1 g",
    "0 G",
    "1.1 w",
    rectRedondeado(x, arriba, tam, tam, 8, "B"),
    // Cola
    "1 J",
    `${n(14 * s)} w`,
    `${n(vx(488))} ${y(vy(512))} m`,
    `${n(vx(545))} ${y(vy(502))} ${n(vx(562))} ${y(vy(442))} ${n(vx(538))} ${y(vy(415))} c S`,
    // Cuerpo y patas (blanco con contorno negro)
    "1 w",
    "1 g",
    "0 G",
    elipseRotada(vx(400), vy(478), 104 * s, 84 * s, 0, "B"),
    rectRedondeado(vx(350), vy(485), 34 * s, 66 * s, 16 * s, "B"),
    rectRedondeado(vx(416), vy(485), 34 * s, 66 * s, 16 * s, "B"),
    // Orejas (trazo y relleno oscuro suave en escala de grises o blanco con borde)
    "0.88 g",
    elipseRotada(vx(322), vy(334), 28 * s, 60 * s, 22, "B"),
    elipseRotada(vx(478), vy(334), 28 * s, 60 * s, -22, "B"),
    // Cabeza y hocico
    "1 g",
    elipseRotada(vx(400), vy(336), 88 * s, 88 * s, 0, "B"),
    elipseRotada(vx(400), vy(372), 48 * s, 36 * s, 0, "B"),
    // Collar y placa
    "0 g",
    rectRedondeado(vx(342), vy(412), 116 * s, 18 * s, 9 * s, "f"),
    "1 g",
    elipseRotada(vx(400), vy(442), 12 * s, 12 * s, 0, "B"),
    // Ojos y nariz en negro sólido
    "0 g",
    elipseRotada(vx(366), vy(318), 10 * s, 10 * s, 0, "f"),
    elipseRotada(vx(434), vy(318), 10 * s, 10 * s, 0, "f"),
    elipseRotada(vx(400), vy(354), 16 * s, 11 * s, 0, "f"),
    // Sonrisa
    "1 w",
    `${n(vx(400))} ${y(vy(365))} m ${n(vx(400))} ${y(vy(380))} l S`,
    `${n(vx(382))} ${y(vy(384))} m ${n(vx(392))} ${y(vy(394))} ${n(vx(408))} ${y(vy(394))} ${n(vx(418))} ${y(vy(384))} c S`,
    "Q",
  ].join("\n");
};

const texto = (
  fuente: "F1" | "F2",
  tam: number,
  x: number,
  arriba: number,
  contenido: string,
) => `BT /${fuente} ${tam} Tf ${n(x)} ${y(arriba)} Td ${cadenaPdf(contenido)} Tj ET`;

const fechaEmision = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export const generarPdfCarnet = (carnet: DatosCarnet): Uint8Array => {
  const anchoUtil = ANCHO - MARGEN * 2;
  const folio = carnet.id.slice(0, 8).toUpperCase();
  const hoy = ahoraEnClinica().fecha;

  const completadas = carnet.visitas.filter((v) => v.estado === "completada");
  const resumenPuntos = calcularPuntosVisitas(carnet.visitas, hoy);
  const puntosTotales = resumenPuntos.vigentes;
  const nivel = nivelDePuntos(puntosTotales);

  const pastillaTexto = `${numero.format(puntosTotales)} pts · ${nivel.nombre}`;
  const anchoPastilla = pastillaTexto.length * 6.5 + 24;
  const xPastilla = ANCHO - MARGEN - anchoPastilla;

  const textoVigencia = resumenPuntos.proximoVencimiento
    ? `Caducidad: ${MESES_CADUCIDAD_PUNTOS} meses · Próx. vencimiento: ${numero.format(resumenPuntos.proximoVencimiento.puntos)} pts el ${fechaCorta.format(new Date(`${resumenPuntos.proximoVencimiento.fecha}T00:00:00Z`))}`
    : `Los puntos acumulados tienen una caducidad de ${MESES_CADUCIDAD_PUNTOS} meses desde cada visita`;

  const ops: string[] = [
    // Encabezado en blanco y negro con Canela, la mascota de VetCareHub
    dibujarMascota(MARGEN, 38, 48),
    "0 g",
    "0 G",
    texto("F2", 20, MARGEN + 58, 60, "VetCareHub"),
    texto("F1", 10.5, MARGEN + 58, 76, "Carnet clínico y programa de puntos · Cuernavaca, Morelos"),

    // Pastilla de puntos y nivel a la derecha
    "1.2 w",
    rectRedondeado(xPastilla, 46, anchoPastilla, 26, 13, "S"),
    texto("F2", 10.5, xPastilla + 12, 63, pastillaTexto),

    // Línea divisoria del encabezado
    "1.5 w",
    `${MARGEN} ${y(98)} m ${ANCHO - MARGEN} ${y(98)} l S`,

    // Título y folio
    texto("F2", 20, MARGEN, 130, "Carnet clínico y de fidelidad"),
    texto(
      "F1",
      10.5,
      MARGEN,
      147,
      `Folio #VCH-${folio} · Cliente desde ${fechaCorta.format(new Date(carnet.alta))} · Expedido el ${fechaEmision.format(new Date())}`,
    ),

    // Bloque 1: Datos del titular y puntos acumulados
    "1.2 w",
    rectRedondeado(MARGEN, 164, anchoUtil, 110, 10, "S"),
    texto("F2", 9.5, MARGEN + 18, 184, "TITULAR DEL CARNET"),
    texto("F2", 14, MARGEN + 18, 202, cortar(carnet.nombre, 34)),
    texto("F1", 10.5, MARGEN + 18, 219, cortar(carnet.correo, 42)),
    texto("F1", 10.5, MARGEN + 18, 235, `Tel. ${carnet.telefono ?? "No registrado"}`),
    texto(
      "F1",
      9.5,
      MARGEN + 18,
      256,
      `${carnet.mascotas.length} ${carnet.mascotas.length === 1 ? "mascota registrada" : "mascotas registradas"} · ${completadas.length} ${completadas.length === 1 ? "visita completada" : "visitas completadas"}`,
    ),

    // Separador vertical en la tarjeta del titular
    "0.6 w",
    `${MARGEN + 265} ${y(176)} m ${MARGEN + 265} ${y(262)} l S`,

    texto("F2", 9.5, MARGEN + 280, 184, "PUNTOS VIGENTES (CADUCIDAD DE 6 MESES)"),
    texto("F2", 21, MARGEN + 280, 207, `${numero.format(puntosTotales)} puntos`),
    texto("F2", 10.5, MARGEN + 280, 224, `Nivel actual: ${nivel.nombre}`),
    texto("F1", 9.2, MARGEN + 280, 239, cortar(nivel.beneficio, 46)),
    texto("F2", 8.8, MARGEN + 280, 255, cortar(textoVigencia, 48)),
  ];

  // Bloque 2: Mascotas registradas en el carnet
  const mascotasMostradas = carnet.mascotas.slice(0, 4);
  const altoMascotas = Math.max(66, 44 + mascotasMostradas.length * 20);
  const yMascotas = 288;

  ops.push(
    "1.2 w",
    rectRedondeado(MARGEN, yMascotas, anchoUtil, altoMascotas, 10, "S"),
    texto("F2", 12, MARGEN + 18, yMascotas + 21, "Mascotas registradas en el carnet"),
    "0.6 w",
    `${MARGEN + 18} ${y(yMascotas + 30)} m ${ANCHO - MARGEN - 18} ${y(yMascotas + 30)} l S`,
  );

  if (mascotasMostradas.length === 0) {
    ops.push(texto("F1", 10.5, MARGEN + 18, yMascotas + 50, "Aún no hay mascotas registradas."));
  } else {
    mascotasMostradas.forEach((m, idx) => {
      const visitasM = completadas.filter((v) => v.mascota_id === m.id);
      const ptsM = visitasM
        .filter((v) => puntosVigentesEn(v.fecha, hoy))
        .reduce((acc, v) => acc + puntosServicio[v.servicio], 0);
      const filaY = yMascotas + 48 + idx * 19;
      const detalle = [
        especies[m.especie],
        m.raza || "Sin raza especificada",
        m.nacimiento ? edad(m.nacimiento) : null,
      ]
        .filter(Boolean)
        .join(" · ");

      ops.push(
        texto("F2", 10.5, MARGEN + 18, filaY, cortar(m.nombre, 20)),
        texto("F1", 10, MARGEN + 145, filaY, cortar(detalle, 42)),
        texto(
          "F2",
          10,
          ANCHO - MARGEN - 125,
          filaY,
          `${visitasM.length} ${visitasM.length === 1 ? "visita" : "visitas"} · +${numero.format(ptsM)} pts`,
        ),
      );
    });
  }

  // Bloque 3: Historial de visitas y puntos
  const yHistorial = yMascotas + altoMascotas + 14;
  const visitasMostradas = carnet.visitas.slice(0, 10);
  const altoHistorial = Math.min(710 - yHistorial, Math.max(92, 64 + visitasMostradas.length * 22));

  ops.push(
    "1.2 w",
    rectRedondeado(MARGEN, yHistorial, anchoUtil, altoHistorial, 10, "S"),
    texto("F2", 12, MARGEN + 18, yHistorial + 21, "Historial de visitas y citas"),
    "0.6 w",
    `${MARGEN + 18} ${y(yHistorial + 30)} m ${ANCHO - MARGEN - 18} ${y(yHistorial + 30)} l S`,
  );

  if (visitasMostradas.length === 0) {
    ops.push(
      texto(
        "F1",
        10.5,
        MARGEN + 18,
        yHistorial + 54,
        "Todavía no hay visitas registradas en el carnet.",
      ),
    );
  } else {
    const yCabecera = yHistorial + 46;
    ops.push(
      texto("F2", 9, MARGEN + 18, yCabecera, "FECHA Y HORA"),
      texto("F2", 9, MARGEN + 118, yCabecera, "MASCOTA"),
      texto("F2", 9, MARGEN + 198, yCabecera, "SERVICIO Y COSTO"),
      texto("F2", 9, MARGEN + 356, yCabecera, "ESTADO"),
      texto("F2", 9, MARGEN + 418, yCabecera, "PUNTOS (CAD. 6M)"),
    );

    visitasMostradas.forEach((v, idx) => {
      const filaY = yCabecera + 18 + idx * 20;
      if (filaY > yHistorial + altoHistorial - 10) return;
      const fechaTexto = `${fechaCorta.format(new Date(`${v.fecha}T00:00:00Z`))} ${v.hora}`;
      const servicioCosto = `${cortar(servicios[v.servicio], 18)} (${pesos.format(preciosServicio[v.servicio])})`;
      const caducaTexto = fechaCorta.format(new Date(`${fechaCaducidadPuntos(v.fecha)}T00:00:00Z`));
      const vigente = puntosVigentesEn(v.fecha, hoy);
      const pts =
        v.estado === "completada"
          ? vigente
            ? `+${puntosServicio[v.servicio]} (${caducaTexto})`
            : `+${puntosServicio[v.servicio]} (vencidos)`
          : "0 pts";

      ops.push(
        texto("F1", 9, MARGEN + 18, filaY, fechaTexto),
        texto("F2", 9, MARGEN + 118, filaY, cortar(v.mascota, 13)),
        texto("F1", 9, MARGEN + 198, filaY, servicioCosto),
        texto("F1", 9, MARGEN + 356, filaY, estados[v.estado]),
        texto("F2", 8.8, MARGEN + 418, filaY, pts),
      );
    });
  }

  // Pie de página con horario actualizado a 19:00 h
  ops.push(
    "0.6 w",
    `${MARGEN} ${y(724)} m ${ANCHO - MARGEN} ${y(724)} l S`,
    texto(
      "F2",
      10,
      MARGEN,
      741,
      "VetCareHub · Av. Emiliano Zapata 123, Tlaltenango, Cuernavaca, Morelos",
    ),
    texto(
      "F1",
      9.5,
      MARGEN,
      756,
      "Tel. 777 123 4567 · vetcarehubmx@gmail.com · Atención de 9:00 a 19:00 h",
    ),
  );

  const contenido = ops.join("\n");
  const objetos = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`,
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj",
    `6 0 obj\n<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream\nendobj`,
    `7 0 obj\n<< /Title ${cadenaPdf(`Carnet de ${carnet.nombre} - VetCareHub`)} /Author (VetCareHub) >>\nendobj`,
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
