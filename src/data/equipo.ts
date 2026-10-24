// Personal de la clínica. Lo usan el organigrama de /nosotros y el script que crea las
// cuentas del sistema, así que no importa nada de Astro (las fotos van en Organigrama.astro)

// Los tres niveles del organigrama. Cada uno tiene sus permisos en src/lib/permisos.ts
export type Rol = "gerencia" | "jefatura" | "personal";

export type Persona = {
  nombre: string;
  puesto: string;
  // El correo es apellido.nombre
  usuario: string;
  rol: Rol;
};

export const correoDe = (usuario: string) => `${usuario}@vetcarehub.mx`;

export const direccion: Persona = {
  nombre: "Ángel Emiliano García Nájera",
  puesto: "Gerencia general",
  usuario: "garcia.angel",
  rol: "gerencia",
};

const jefe = (nombre: string, puesto: string, usuario: string): Persona => ({
  nombre,
  puesto,
  usuario,
  rol: "jefatura",
});

const miembro = (nombre: string, puesto: string, usuario: string): Persona => ({
  nombre,
  puesto,
  usuario,
  rol: "personal",
});

// El orden importa para el acomodo del organigrama: las dos primeras áreas cuelgan del
// tronco, una de cada lado, y las otras tres van en fila al final
export const areas: (Persona & { equipo: Persona[] })[] = [
  {
    ...jefe("María Fernanda Velázquez Miranda", "Subgerencia", "velazquez.maria"),
    equipo: [
      miembro("Juan Eduardo Ocampo Castillo", "Recepción", "ocampo.juan"),
      miembro("Román Gutiérrez Ocampo", "Estética y baño", "gutierrez.roman"),
    ],
  },
  {
    ...jefe("María del Carmen Barajas Galicia", "Responsable sanitario", "barajas.maria"),
    equipo: [],
  },
  {
    ...jefe(
      "Abraham Enrique Becerril Téllez",
      "Jefatura de medicina general",
      "becerril.abraham",
    ),
    equipo: [
      miembro("Luis Arturo Joaquín Landa", "Consulta y vacunación", "joaquin.luis"),
      miembro("Eder Alyarimi Martínez Silva", "Limpieza y desinfección", "martinez.eder"),
    ],
  },
  {
    ...jefe("Ángel Ismael Flores Flores", "Jefatura de cirugía", "flores.angel"),
    equipo: [
      miembro("Marcus Arif Hernández Ostos", "Anestesia", "hernandez.marcus"),
      miembro("Nicolás Giles Calva", "Hospitalización", "giles.nicolas"),
    ],
  },
  {
    ...jefe("Eduardo García Harrison", "Jefatura de laboratorio", "garcia.eduardo"),
    equipo: [
      miembro("Eros Ramsés Román Tapia", "Análisis e imagen", "roman.eros"),
      miembro("Azeneth García García", "Lavado de material", "garcia.azeneth"),
    ],
  },
];

// Todos en una sola lista, para crear las cuentas
export const equipo: Persona[] = [
  direccion,
  ...areas.flatMap(({ equipo, ...jefe }) => [jefe, ...equipo]),
];
