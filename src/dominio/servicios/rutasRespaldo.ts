import type { ArchivoUbicado } from "../repositorios/IUbicacionArchivosRepositorio";

/**
 * Dónde va cada cosa dentro del ZIP del respaldo del consultorio.
 *
 *   Pacientes/<Apellido Nombre>/      todo lo del paciente
 *   Sin paciente/                     lo que no es de nadie en particular
 *
 * Es una regla pura (sin bucket ni base) para poder testearla: el que arma el
 * ZIP solo pregunta acá la ruta y no decide nada.
 */

export const CARPETA_PACIENTES = "Pacientes";
export const CARPETA_SIN_PACIENTE = "Sin paciente";

/** Largo máximo de un segmento: Windows corta la ruta entera en 260. */
const LARGO_MAXIMO_SEGMENTO = 80;

/**
 * Un nombre que se puede usar como carpeta o archivo en cualquier sistema:
 * sin separadores ni los caracteres que Windows prohíbe, sin punto ni espacio
 * al final (Windows los come) y nunca vacío.
 */
export function segmento(texto: string, alternativa = "sin nombre"): string {
  const limpio = texto
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LARGO_MAXIMO_SEGMENTO)
    .replace(/[. ]+$/, "");
  return limpio || alternativa;
}

/** La fecha como `AAAA-MM-DD`, que ordena bien alfabéticamente. Leída en UTC. */
export function fechaParaRuta(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** La extensión del nombre original (con el punto), o "" si no tiene una creíble. */
export function extension(nombre: string): string {
  const coincidencia = /\.([a-zA-Z0-9]{1,6})$/.exec(nombre);
  return coincidencia?.[1] ? `.${coincidencia[1].toLowerCase()}` : "";
}

/** La carpeta de un paciente. Los archivados se marcan, no se separan. */
export function carpetaDePaciente(paciente: {
  nombre: string;
  apellido: string;
  archivado: boolean;
}): string {
  const nombre = segmento(`${paciente.apellido} ${paciente.nombre}`);
  return `${CARPETA_PACIENTES}/${paciente.archivado ? `${nombre} (archivado)` : nombre}`;
}

/**
 * Las rutas de un archivo del bucket en el ZIP. Casi siempre una; un plan
 * asignado a varios pacientes va a la carpeta de cada uno, porque la carpeta
 * de un paciente tiene que alcanzar sola para entender su tratamiento.
 *
 * `carpetas` es pacienteId → carpeta. Un paciente que no esté (no debería
 * pasar: la FK es en cascada) manda el archivo a «Sin paciente» antes que
 * perderlo.
 */
export function rutasDeArchivo(
  archivo: ArchivoUbicado,
  carpetas: ReadonlyMap<string, string>,
): string[] {
  const nombre = segmento(archivo.nombreOriginal, "archivo");
  const ext = extension(archivo.nombreOriginal);
  const u = archivo.ubicacion;
  const otros = `${CARPETA_SIN_PACIENTE}/Otros/${nombre}`;
  const enPaciente = (pacienteId: string, resto: string): string => {
    const carpeta = carpetas.get(pacienteId);
    return carpeta ? `${carpeta}/${resto}` : otros;
  };

  switch (u.tipo) {
    case "PACIENTE":
      return [
        u.fechaProgreso
          ? enPaciente(
              u.pacienteId,
              `Fotos de progreso/${fechaParaRuta(u.fechaProgreso)} ${nombre}`,
            )
          : enPaciente(u.pacienteId, `Archivos/${nombre}`),
      ];
    case "LABORATORIO":
      return [
        enPaciente(
          u.pacienteId,
          `Laboratorios/${fechaParaRuta(u.fecha)} ${segmento(u.titulo)}/${nombre}`,
        ),
      ];
    case "DIARIO":
      return [
        enPaciente(
          u.pacienteId,
          `Diario/${fechaParaRuta(u.fecha)} ${segmento(u.franja)}${ext}`,
        ),
      ];
    case "GRABACION":
      return [
        enPaciente(
          u.pacienteId,
          `Grabaciones/${fechaParaRuta(u.fecha)} consulta ${u.orden}${ext}`,
        ),
      ];
    case "PLAN": {
      const resto = `Planes/${segmento(u.plan)}/${nombre}`;
      const conCarpeta = u.pacienteIds.filter((id) => carpetas.has(id));
      return conCarpeta.length > 0
        ? conCarpeta.map((id) => enPaciente(id, resto))
        : [`${CARPETA_SIN_PACIENTE}/${resto}`];
    }
    case "RECETA":
      return [
        `${CARPETA_SIN_PACIENTE}/Recetas/${segmento(u.receta)}/${nombre}`,
      ];
    case "MATERIAL":
      return [
        `${CARPETA_SIN_PACIENTE}/Biblioteca/${segmento(u.material)}/${nombre}`,
      ];
    case "SIN_DUENO":
      return [otros];
  }
}

/**
 * Lleva la cuenta de las rutas usadas y desempata las repetidas con « (2)»,
 * « (3)»… antes de la extensión. Un ZIP admite dos entradas con el mismo
 * nombre, pero al descomprimirlo una pisa a la otra sin avisar. Compara sin
 * mayúsculas: en Windows y macOS «Foto.jpg» y «foto.jpg» son el mismo archivo.
 */
export class RutasUnicas {
  private readonly usadas = new Set<string>();

  /** Una carpeta no tiene extensión: «Pérez J.R» desempata al final. */
  reservarCarpeta(ruta: string): string {
    return this.desempatar(ruta, "");
  }

  reservar(ruta: string): string {
    return this.desempatar(
      ruta,
      extension(ruta.slice(ruta.lastIndexOf("/") + 1)),
    );
  }

  private desempatar(ruta: string, ext: string): string {
    const base = ext ? ruta.slice(0, -ext.length) : ruta;
    let candidata = ruta;
    for (let n = 2; this.usadas.has(candidata.toLowerCase()); n++) {
      candidata = `${base} (${n})${ext}`;
    }
    this.usadas.add(candidata.toLowerCase());
    return candidata;
  }
}
