import { isInputError, type ActionError } from "astro:actions";
import { normalizar } from "../lib/formato";

// Lo que comparten Inventario y Proveedores en el navegador

// Oculta las filas que no contienen lo que se escribe en el buscador. Cada fila trae en
// data-buscar su texto en minúsculas y sin acentos
export const activarBuscador = (buscador: HTMLInputElement | null, tabla: HTMLElement | null) => {
  if (!buscador || !tabla) return;
  const filas = [...tabla.querySelectorAll<HTMLTableRowElement>("tbody tr")];
  const sinResultados = document.querySelector<HTMLElement>(".sin-resultados");

  buscador.addEventListener("input", () => {
    const texto = normalizar(buscador.value.trim());
    let visibles = 0;
    for (const fila of filas) {
      const coincide = fila.dataset.buscar?.includes(texto) ?? true;
      fila.hidden = !coincide;
      if (coincide) visibles++;
    }
    if (sinResultados) {
      sinResultados.hidden = visibles > 0;
      sinResultados.textContent = `Nada coincide con “${buscador.value.trim()}”.`;
    }
  });
};

// Aviso de error abajo de la pantalla (está en src/layouts/Sistema.astro). Se quita solo
let temporizador: ReturnType<typeof setTimeout> | undefined;
export const mostrarError = (texto: string) => {
  const aviso = document.querySelector<HTMLElement>("#aviso-error");
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => (aviso.hidden = true), 5000);
};

// El mensaje que se muestra cuando una acción falla: el del primer campo con error, o el
// que mandó el servidor
export const mensajeDeError = (error: ActionError) => {
  if (isInputError(error)) {
    const primero = Object.values(error.fields).flat()[0];
    if (primero) return primero;
  }
  if (error.code === "FORBIDDEN" || error.code === "CONFLICT" || error.code === "BAD_REQUEST") {
    return error.message;
  }
  return "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
};

// Envía el formulario de una ventana con la acción que se le pase. Si sale bien recarga
// la página para ver la tabla al día; si no, deja la ventana abierta con el error
export const enviarConAccion = (
  dialogo: HTMLDialogElement | null,
  accion: (datos: FormData) => Promise<{ error?: ActionError }>,
) => {
  const form = dialogo?.querySelector<HTMLFormElement>("form");
  const error = dialogo?.querySelector<HTMLElement>(".error-form");
  const enviar = form?.querySelector<HTMLButtonElement>("[type=submit]:not([value=cancelar])");
  if (!dialogo || !form || !error || !enviar) return;

  form.addEventListener("submit", async (event) => {
    // Cancelar cierra la ventana sin guardar (method="dialog")
    if ((event.submitter as HTMLButtonElement | null)?.value === "cancelar") return;
    event.preventDefault();
    if (!form.reportValidity()) return;

    error.textContent = "";
    enviar.disabled = true;
    const resultado = await accion(new FormData(form));
    if (resultado.error) {
      error.textContent = mensajeDeError(resultado.error);
      error.scrollIntoView({ block: "nearest" });
      enviar.disabled = false;
      return;
    }
    location.reload();
  });

  dialogo.addEventListener("close", () => {
    error.textContent = "";
  });
};
