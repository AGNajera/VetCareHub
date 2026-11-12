import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth";
import { esCliente } from "./lib/permisos";

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

  // Todo lo que está dentro de /dashboard es para el personal y lo de /cliente, para los
  // clientes. Quien no inició sesión va al login; quien entra al panel que no es el suyo,
  // al suyo
  const { pathname } = context.url;
  const enSistema = /^\/dashboard(\/|$)/.test(pathname);
  const enCliente = /^\/cliente(\/|$)/.test(pathname);
  if (!enSistema && !enCliente) return next();

  const { user } = context.locals;
  if (!user) return context.redirect("/login");
  if (enSistema && esCliente(user.role)) return context.redirect("/cliente");
  if (enCliente && !esCliente(user.role)) return context.redirect("/dashboard");

  return next();
});
