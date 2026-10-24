import { createAuthClient } from "better-auth/client";

// Cliente del navegador. Solo se usa para iniciar y cerrar sesión; la sesión se lee en el
// servidor (src/middleware.ts)
export const authClient = createAuthClient();
