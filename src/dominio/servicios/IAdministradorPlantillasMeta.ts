import type {
  CategoriaMeta,
  EstadoPlantillaMeta,
} from "../entidades/PlantillaWhatsapp";

/** Un botón tal como se registra en Meta. */
export type BotonPlantillaMeta =
  | { tipo: "QUICK_REPLY"; texto: string }
  | {
      tipo: "URL";
      texto: string;
      /** URL fija, o con `{{1}}` al final si es dinámica. */
      url: string;
      /** URL de ejemplo completa, obligatoria para las dinámicas. */
      ejemplo: string | null;
    };

/** Lo que se manda a Meta para dar de alta (o editar) una plantilla. */
export interface DefinicionPlantillaMeta {
  nombre: string;
  idioma: string;
  categoria: CategoriaMeta;
  /** Cuerpo con los parámetros numerados: `Hola {{1}}, tu turno…`. */
  cuerpo: string;
  /** Un valor de ejemplo por parámetro: Meta los exige para revisarla. */
  ejemplosCuerpo: string[];
  botones: BotonPlantillaMeta[];
}

/** Estado de una plantilla según Meta. */
export interface EstadoPlantillaRemota {
  idMeta: string;
  nombre: string;
  idioma: string;
  estado: EstadoPlantillaMeta;
  motivo: string | null;
}

/**
 * Puerto para administrar las plantillas en la cuenta de WhatsApp Business
 * del consultorio: darlas de alta, editarlas, borrarlas y consultar cómo va
 * su revisión.
 *
 * Es un puerto aparte de `IProveedorWhatsapp` porque es otra API de Meta, con
 * otra credencial (el id de la cuenta de WhatsApp Business, no el del número)
 * y otro permiso del token. Un consultorio puede enviar sin poder administrar.
 *
 * Un rechazo de Meta (nombre repetido, formato inválido) sale como
 * `ErrorValidacion` con el motivo, porque es algo que el profesional corrige.
 */
export interface IAdministradorPlantillasMeta {
  /** Hay credenciales para administrar plantillas (token + id de la cuenta). */
  disponible(): Promise<boolean>;
  crear(
    definicion: DefinicionPlantillaMeta,
  ): Promise<{ idMeta: string; estado: EstadoPlantillaMeta }>;
  /** Editar en Meta la vuelve a mandar a revisión. */
  editar(idMeta: string, definicion: DefinicionPlantillaMeta): Promise<void>;
  eliminar(nombre: string, idMeta: string): Promise<void>;
  /** Todas las plantillas de la cuenta, con su estado. */
  listar(): Promise<EstadoPlantillaRemota[]>;
}
