import type { CamposHistoriaClinica } from "../entidades/HistoriaClinica";

/**
 * Puerto que interpreta una foto/documento de historia clínica con IA y
 * devuelve los campos que pudo reconocer, para PRECARGAR el formulario. El
 * profesional revisa y guarda: esto no persiste nada por sí mismo.
 */
export interface IInterpretadorHistoriaClinica {
  interpretar(archivo: {
    clave: string;
    mimeType: string;
  }): Promise<Partial<CamposHistoriaClinica>>;
}
