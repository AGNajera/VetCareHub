import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;

  // Las páginas estáticas se arman en el build, donde no hay nadie con sesión
  if (context.isPrerendered) return next();

  const sesion = await auth.api.getSession({ headers: context.request.headers });
  if (sesion) {
    context.locals.user = sesion.user;
    context.locals.session = sesion.session;
  }

  // Todo lo que está dentro de /dashboard es para quien inició sesión
  const enSistema = /^\/dashboard(\/|$)/.test(context.url.pathname);
  if (enSistema && !context.locals.user) return context.redirect("/login");

  return next();
});
