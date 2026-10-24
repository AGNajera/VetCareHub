// Fotos del personal, por usuario (apellido.nombre). Están en src/assets/img, ya
// recortadas en cuadro. Las usan el organigrama de /nosotros y la cuenta del sidebar del
// sistema; va aparte de equipo.ts porque ese lo carga también el script de las cuentas,
// que corre fuera de Astro y no puede importar imágenes
import fotoAngelG from "../assets/img/AngelG.webp";
import fotoAngelIsmael from "../assets/img/AngelIsmael.webp";
import fotoAzenet from "../assets/img/Azenet.webp";
import fotoEduardo from "../assets/img/Eduardo.webp";
import fotoEnrique from "../assets/img/Enrique.webp";
import fotoEros from "../assets/img/Eros.webp";
import fotoJuan from "../assets/img/Juan.webp";
import fotoLuis from "../assets/img/Luis.webp";
import fotoMarcus from "../assets/img/Marcus.webp";
import fotoMariaF from "../assets/img/MariaF.webp";
import fotoNico from "../assets/img/Nico.webp";
import fotoRoman from "../assets/img/Roman.webp";
import fotoEder from "../assets/img/Eder.webp";

export const fotos: Record<string, ImageMetadata> = {
  "garcia.angel": fotoAngelG,
  "velazquez.maria": fotoMariaF,
  "ocampo.juan": fotoJuan,
  "gutierrez.roman": fotoRoman,
  "becerril.abraham": fotoEnrique,
  "joaquin.luis": fotoLuis,
  "martinez.eder": fotoEder,
  "flores.angel": fotoAngelIsmael,
  "hernandez.marcus": fotoMarcus,
  "giles.nicolas": fotoNico,
  "garcia.eduardo": fotoEduardo,
  "roman.eros": fotoEros,
  "garcia.azeneth": fotoAzenet,
};

// El correo es usuario@vetcarehub.mx; a quien todavía no tiene foto le toca null
export const fotoDeCorreo = (correo: string) => fotos[correo.split("@")[0]] ?? null;
