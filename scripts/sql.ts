// Aplica los archivos de db/migraciones en orden, cada uno en una transacción. Los que ya
// se aplicaron quedan anotados en la tabla migraciones y se saltan, así que se puede
// volver a correr cuando se agregue uno nuevo (002-..., 003-...).
// Con --ejemplo también carga db/datos-ejemplo.sql, que es solo para local.
//
//   Local:      pnpm db:migrar
//   Producción: pnpm db:migrar:produccion
//   Ejemplo:    pnpm db:ejemplo

import { readdirSync, readFileSync } from "node:fs";
import { pool } from "../src/lib/db";

const carpeta = new URL("../db/migraciones/", import.meta.url);
const base = new URL(process.env.DATABASE_URL ?? "").hostname;
console.log(`Base de datos: ${base}\n`);

await pool.query(`
  create table if not exists migraciones (
    nombre text primary key,
    aplicada_en timestamptz not null default now()
  )
`);

const { rows } = await pool.query<{ nombre: string }>("select nombre from migraciones");
const aplicadas = new Set(rows.map(({ nombre }) => nombre));
const pendientes = readdirSync(carpeta)
  .filter((archivo) => archivo.endsWith(".sql") && !aplicadas.has(archivo))
  .sort();

for (const archivo of pendientes) {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    await cliente.query(readFileSync(new URL(archivo, carpeta), "utf8"));
    await cliente.query("insert into migraciones (nombre) values ($1)", [archivo]);
    await cliente.query("commit");
    console.log(`✓ ${archivo}`);
  } catch (error) {
    await cliente.query("rollback");
    console.error(`✗ ${archivo}: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  } finally {
    cliente.release();
  }
}

console.log(pendientes.length ? "" : "No hay migraciones pendientes.");

if (process.argv.includes("--ejemplo")) {
  await pool.query(readFileSync(new URL("../db/datos-ejemplo.sql", import.meta.url), "utf8"));
  console.log("✓ datos-ejemplo.sql");
}

await pool.end();
