import { actions, isInputError, type ActionError } from "astro:actions";
import { normalizar } from "../lib/formato";
import { ahoraEnClinica } from "../lib/citas";

// Lo que comparten las páginas del sistema y del panel de clientes en el navegador

// Oculta las filas que no contienen lo que se escribe en el buscador. Cada fila trae en
// data-buscar su texto en minúsculas y sin acentos
export const activarBuscador = (buscador: HTMLInputElement | null, tabla: HTMLElement | null) => {
  if (!buscador || !tabla) return;
  const filas = [...tabla.querySelectorAll<HTMLTableRowElement>("tbody tr")];
  const sinResultados = document.querySelector<HTMLElement>(".sin-resultados");
  // Cuántas filas quedaron se lee en voz alta (el aviso está en src/layouts/Sistema.astro),
  // cuando se deja de escribir para no leerlo a cada letra
  const aviso = document.querySelector<HTMLElement>("#aviso");
  let espera: ReturnType<typeof setTimeout> | undefined;

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
    clearTimeout(espera);
    espera = setTimeout(() => {
      if (!aviso) return;
      aviso.textContent =
        visibles === 0
          ? "Sin resultados"
          : `${visibles} ${visibles === 1 ? "resultado" : "resultados"}`;
    }, 500);
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
  if (["FORBIDDEN", "CONFLICT", "BAD_REQUEST", "NOT_FOUND"].includes(error.code)) {
    return error.message;
  }
  return "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
};

// Envía el formulario de una ventana con la acción que se le pase. Si sale bien recarga
// la página para ver la tabla al día (o, si se pasa alTerminar, hace eso con lo que
// devolvió la acción); si no, deja la ventana abierta con el error
export const enviarConAccion = <T>(
  dialogo: HTMLDialogElement | null,
  accion: (datos: FormData) => Promise<{ data?: T; error?: ActionError }>,
  alTerminar?: (data: T) => void,
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
    if (!alTerminar) return location.reload();
    enviar.disabled = false;
    dialogo.close();
    alTerminar(resultado.data as T);
  });

  dialogo.addEventListener("close", () => {
    error.textContent = "";
  });
};

// En el formulario de una cita, al elegir el día se desactivan los horarios que ya están
// apartados (y, con soloFuturo, los que ya pasaron hoy). Devuelve la función que lo hace,
// para llamarla también después de llenar el formulario al editar
export const activarHorarios = (form: HTMLFormElement | null | undefined, soloFuturo = false) => {
  const fecha = form?.querySelector<HTMLInputElement>("[name=fecha]");
  const hora = form?.querySelector<HTMLSelectElement>("[name=hora]");
  const id = form?.querySelector<HTMLInputElement>("[name=id]");
  if (!form || !fecha || !hora) return async () => {};
  let consulta = 0;

  const actualizar = async () => {
    const opciones = [...hora.options].filter((opcion) => opcion.value);
    for (const opcion of opciones) {
      opcion.disabled = false;
      opcion.textContent = opcion.value;
    }
    if (!fecha.value) return;

    const esta = ++consulta;
    const { data } = await actions.citas.ocupadas({ fecha: fecha.value, excluir: id?.value || null });
    // Si mientras tanto se eligió otro día, esta respuesta ya no sirve
    if (esta !== consulta) return;

    const ocupadas = new Set(data ?? []);
    const ahora = ahoraEnClinica();
    for (const opcion of opciones) {
      const paso = soloFuturo && `${fecha.value} ${opcion.value}` <= `${ahora.fecha} ${ahora.hora}`;
      if (ocupadas.has(opcion.value) || paso) {
        opcion.disabled = true;
        opcion.textContent = `${opcion.value} · ${paso ? "ya pasó" : "ocupado"}`;
      }
    }
    if (hora.selectedOptions[0]?.disabled) hora.value = "";
  };

  fecha.addEventListener("change", actualizar);
  return actualizar;
};

// Llena los campos de un formulario con los datos de una fila (al editar). Los que no
// vienen en datos se quedan como al cargar la página. Los ocultos se vacían a mano porque
// reset() no los regresa a su valor original
export const llenarFormulario = (form: HTMLFormElement, datos: Record<string, unknown> = {}) => {
  form.reset();
  for (const campo of form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")) {
    if (!campo.name) continue;
    if (campo.name in datos) campo.value = datos[campo.name] == null ? "" : String(datos[campo.name]);
    else if (campo.type === "hidden") campo.value = "";
  }
};
