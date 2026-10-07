// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // El CSS de cada página pesa menos de 20 KB: va dentro del HTML para no pedir dos hojas
  // aparte, que en celular detienen el primer pintado hasta que llegan
  build: {
    inlineStylesheets: 'always',
  },
});
