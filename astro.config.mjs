// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { existsSync } from 'node:fs';

// Better Auth lee las variables de process.env (ver src/lib/auth.ts). En Vercel ya vienen
// ahí; en local Astro solo pasa .env a import.meta.env, así que aquí se cargan también
if (existsSync('.env')) process.loadEnvFile('.env');

// https://astro.build/config
export default defineConfig({
  // Las páginas siguen siendo estáticas. El adaptador es para las que llevan
  // prerender = false: el login, el dashboard y la API de Better Auth
  adapter: vercel(),
  // El CSS de cada página pesa menos de 20 KB: va dentro del HTML para no pedir dos hojas
  // aparte, que en celular detienen el primer pintado hasta que llegan
  build: {
    inlineStylesheets: 'always',
  },
});
