import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { ac, roles } from "./permisos";
import { pool } from "./db";

// Se lee de process.env y no de import.meta.env porque este archivo también lo cargan
// la CLI de Better Auth (migraciones) y scripts/crear-cuentas.ts, que corren fuera de Astro
export const auth = betterAuth({
  appName: "VetCareHub",
  database: pool,

  // En local y en producción la URL viene de BETTER_AUTH_URL. Los deploys de preview
  // cambian de URL en cada rama y cada commit, así que ahí no se define y se aceptan
  // solo las dos que Vercel le da a ese deploy
  baseURL: process.env.BETTER_AUTH_URL ?? {
    allowedHosts: [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL].filter(
      (host): host is string => Boolean(host),
    ),
    protocol: "https",
  },

  // Las cuentas las crea la gerencia (scripts/crear-cuentas.ts); nadie se registra solo
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },

  user: {
    additionalFields: {
      // El puesto del organigrama, para mostrarlo en el dashboard
      puesto: { type: "string", required: false, input: false },
    },
  },

  session: {
    // Guarda la sesión firmada en una cookie por 5 minutos, para que el enlace del
    // header no consulte la base de datos en cada página
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  // En Vercel cada función tiene su propia memoria, así que los intentos se cuentan en la
  // base de datos. Iniciar sesión: 5 intentos por minuto
  rateLimit: {
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },

  plugins: [admin({ ac, roles, defaultRole: "cliente", adminRoles: ["gerencia"] })],
});

export type Sesion = typeof auth.$Infer.Session;
