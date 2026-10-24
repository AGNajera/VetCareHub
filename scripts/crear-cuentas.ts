// Crea una cuenta del sistema para cada persona del organigrama (src/data/equipo.ts),
// con una contraseña al azar. Quien ya tiene cuenta se salta, así que se puede volver a
// correr cuando entre alguien nuevo. Las contraseñas se guardan en cuentas.local.txt,
// que no se sube a git, para repartirlas.
//
//   Local:      pnpm cuentas
//   Producción: pnpm cuentas:produccion

import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { auth } from "../src/lib/auth";
import { correoDe, equipo } from "../src/data/equipo";

const archivo = "cuentas.local.txt";
const base = new URL(process.env.DATABASE_URL ?? "").hostname;
appendFileSync(archivo, `\n# ${new Date().toISOString()} · ${base}\n`);

let creadas = 0;

for (const { nombre, puesto, usuario, rol } of equipo) {
  const correo = correoDe(usuario);
  // 12 caracteres de letras, números, - y _
  const password = randomBytes(9).toString("base64url");

  try {
    await auth.api.createUser({
      body: { email: correo, password, name: nombre, role: rol, data: { puesto } },
    });
    appendFileSync(archivo, `${correo}\t${password}\n`);
    creadas++;
    console.log(`✓ ${correo} (${rol})`);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.log(`– ${correo}: ${mensaje}`);
  }
}

console.log(`\n${creadas} cuentas nuevas. Las contraseñas están en ${archivo}`);
process.exit(0);
