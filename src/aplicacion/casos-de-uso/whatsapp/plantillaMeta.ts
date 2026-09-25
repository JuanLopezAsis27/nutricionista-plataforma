import type {
  DestinoBotonUrl,
  PlantillaWhatsapp,
} from "@/dominio/entidades/PlantillaWhatsapp";
import type { Turno } from "@/dominio/entidades/Turno";
import type { DefinicionPlantillaMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type {
  AccionEnlaceTurno,
  IEnlacesTurno,
} from "@/dominio/servicios/IEnlacesTurno";
import type { ParametroBotonEnvio } from "@/dominio/servicios/IProveedorWhatsapp";
import { payloadDeBoton } from "@/dominio/servicios/botonesWhatsapp";
import {
  PREFIJO_WA_ME,
  sufijoCancelacionPorWhatsapp,
} from "@/dominio/servicios/cancelacionPorWhatsapp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { variablesEjemplo } from "../secretaria/variables";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Token de ejemplo para la URL dinámica: Meta pide una URL completa para revisar. */
const TOKEN_EJEMPLO = "ejemplo";

/** Número de ejemplo para el enlace wa.me que revisa Meta. */
const TELEFONO_EJEMPLO = "5491100000000";

/** Qué enlace firmado lleva cada destino que actúa sobre el turno en la app. */
const ACCION_DE_DESTINO: Partial<Record<DestinoBotonUrl, AccionEnlaceTurno>> = {
  CONFIRMACION_TURNO: "CONFIRMAR",
  CANCELACION_TURNO: "CANCELAR",
};

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
  enlaces: IEnlacesTurno,
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
      if (b.destino === "CANCELACION_WHATSAPP") {
        // El número va en la parte dinámica: cambiar el número de
        // cancelaciones no obliga a mandar la plantilla a revisión de nuevo.
        return {
          tipo: "URL",
          texto: b.texto,
          url: `${PREFIJO_WA_ME}{{1}}`,
          ejemplo: `${PREFIJO_WA_ME}${sufijoCancelacionPorWhatsapp(
            TELEFONO_EJEMPLO,
            b.mensaje,
            ejemplos,
          )}`,
        };
      }
      const prefijo = enlaces.prefijo(ACCION_DE_DESTINO[b.destino]!);
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
 * Lo que necesita el botón «cancelar por WhatsApp» en un envío: el número de
 * cancelaciones (E.164, null si no se cargó) y las variables del turno para
 * completar el mensaje.
 */
export interface CancelacionPorChat {
  telefonoE164: string | null;
  variables: Record<string, string>;
}

/**
 * Lo que cada botón necesita en un envío concreto, por su posición en la
 * plantilla: el payload (acción + turno) de las respuestas rápidas, el token
 * de los enlaces de confirmar y cancelar, y el número + mensaje del chat de
 * cancelaciones. Los enlaces fijos no necesitan nada.
 *
 * Sin turno, las respuestas rápidas salen con payload `NINGUNA`: el botón se
 * ve igual y tocarlo no actúa sobre nada. Una plantilla con un enlace sobre el
 * turno no se puede mandar sin turno; eso lo frena antes quien envía
 * (`PlantillaWhatsapp.necesitaTurno`).
 *
 * Lanza si hay botón de chat de cancelaciones y el consultorio no cargó el
 * número: Meta rechazaría la plantilla sin ese parámetro, y el profesional
 * tiene que ver el motivo en el recordatorio fallido.
 */
export function parametrosDeBotones(
  plantilla: PlantillaWhatsapp,
  turno: Turno | null,
  enlaces: IEnlacesTurno,
  cancelacion: CancelacionPorChat,
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
    const accion = ACCION_DE_DESTINO[boton.destino];
    if (accion && turno) {
      // Vence al terminar el día del turno, igual que el del email.
      const url = enlaces.generar(
        accion,
        turno.id,
        new Date(turno.fecha.getTime() + DIA_MS),
      );
      parametros.push({
        indice,
        tipo: "URL",
        sufijo: url.slice(enlaces.prefijo(accion).length),
      });
      return;
    }
    if (boton.destino === "CANCELACION_WHATSAPP") {
      if (!cancelacion.telefonoE164) {
        throw new ErrorValidacion(
          `«${plantilla.nombre}» tiene un botón para cancelar por WhatsApp y falta el número de cancelaciones (Configuración → WhatsApp).`,
        );
      }
      parametros.push({
        indice,
        tipo: "URL",
        sufijo: sufijoCancelacionPorWhatsapp(
          cancelacion.telefonoE164,
          boton.mensaje,
          cancelacion.variables,
        ),
      });
    }
  });
  return parametros;
}
