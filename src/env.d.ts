declare namespace App {
  // Las llena src/middleware.ts en las páginas que no son estáticas
  interface Locals {
    user: import("./lib/auth").Sesion["user"] | null;
    session: import("./lib/auth").Sesion["session"] | null;
  }
}

interface Window {
  turnstile?: {
    reset: (container?: string | HTMLElement) => void;
  };
}
