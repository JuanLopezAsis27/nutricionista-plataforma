import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import type { Turno } from "@/dominio/entidades/Turno";
import type { DefinicionPlantillaMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type { IEnlaceConfirmacionTurno } from "@/dominio/servicios/IEnlaceConfirmacionTurno";
import type { ParametroBotonEnvio } from "@/dominio/servicios/IProveedorWhatsapp";
import { payloadDeBoton } from "@/dominio/servicios/botonesWhatsapp";
import { variablesEjemplo } from "../secretaria/variables";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Token de ejemplo para la URL dinámica: Meta pide una URL completa para revisar. */
const TOKEN_EJEMPLO = "ejemplo";

/** Nombre para los ejemplos que revisa Meta: no es el del profesional real. */
export const PROFESIONAL_DE_EJEMPLO = "Lic. Nutrición";

/**
 * Lo que se le manda a Meta para dar de alta (o editar) la plantilla.
 *
 * Los ejemplos del cuerpo salen de los mismos valores que la vista previa del
 * formulario: Meta los usa para revisarla y los muestra en su panel.
 */
export function definicionParaMeta(
  plantilla: PlantillaWhatsapp,
  enlaces: IEnlaceConfirmacionTurno,
  nombreProfesional: string,
  hoy: Date,
): DefinicionPlantillaMeta {
  const { texto, variables } = plantilla.formatoMeta();
  const ejemplos = variablesEjemplo(nombreProfesional, hoy);
  return {
    nombre: plantilla.claveMeta ?? "",
    idioma: plantilla.idiomaMeta,
    categoria: plantilla.categoriaMeta,
    cuerpo: texto,
    // Meta rechaza un ejemplo vacío.
    ejemplosCuerpo: variables.map((v) => ejemplos[v] || "-"),
    botones: plantilla.botones.map((b) => {
      if (b.tipo === "RESPUESTA_RAPIDA") {
        return { tipo: "QUICK_REPLY", texto: b.texto };
      }
      if (b.destino === "FIJA") {
        return { tipo: "URL", texto: b.texto, url: b.url ?? "", ejemplo: null };
      }
      const prefijo = enlaces.prefijo();
      return {
        tipo: "URL",
        texto: b.texto,
        url: `${prefijo}{{1}}`,
        ejemplo: `${prefijo}${TOKEN_EJEMPLO}`,
      };
    }),
  };
}

/**
 * Lo que cada botón necesita en un envío concreto, por su posición en la
 * plantilla: el payload (acción + turno) de las respuestas rápidas y el token
 * del enlace de confirmación. Los enlaces fijos no necesitan nada.
 *
 * Sin turno, las respuestas rápidas salen con payload `NINGUNA`: el botón se
 * ve igual y tocarlo no actúa sobre nada. Una plantilla con un enlace de
 * confirmación no se puede mandar sin turno; eso lo frena antes quien envía
 * (`PlantillaWhatsapp.necesitaTurno`).
 */
export function parametrosDeBotones(
  plantilla: PlantillaWhatsapp,
  turno: Turno | null,
  enlaces: IEnlaceConfirmacionTurno,
): ParametroBotonEnvio[] {
  const parametros: ParametroBotonEnvio[] = [];
  plantilla.botones.forEach((boton, indice) => {
    if (boton.tipo === "RESPUESTA_RAPIDA") {
      parametros.push({
        indice,
        tipo: "QUICK_REPLY",
        payload: payloadDeBoton(boton.accion, turno?.id ?? null),
      });
      return;
    }
    if (boton.destino === "CONFIRMACION_TURNO" && turno) {
      // Vence al terminar el día del turno, igual que el del email.
      const url = enlaces.generar(
        turno.id,
        new Date(turno.fecha.getTime() + DIA_MS),
      );
      parametros.push({
        indice,
        tipo: "URL",
        sufijo: url.slice(enlaces.prefijo().length),
      });
    }
  });
  return parametros;
}
