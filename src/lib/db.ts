import { Pool } from "pg";

// Una sola conexión a Neon para todo el sistema: la usan Better Auth (src/lib/auth.ts),
// las páginas del dashboard y los scripts. Las consultas van en SQL puro con pool.query.
// Igual que auth.ts, lee de process.env porque los scripts corren fuera de Astro
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
