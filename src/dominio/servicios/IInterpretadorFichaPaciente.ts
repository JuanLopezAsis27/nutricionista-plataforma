import type { CamposHistoriaClinica } from "../entidades/HistoriaClinica";
import type { CampoPersonalizadoHistoria } from "../entidades/HistoriaClinica";
import type {
  TipoAlertaAlimentaria,
  SeveridadAlerta,
} from "../entidades/AlertaAlimentaria";
import type { MedidasAntropometricas } from "../entidades/Antropometria";
import type { SexoBiologico } from "./composicionCorporal";

/** Datos de la persona que se pudieron leer del documento. */
export interface DatosPacienteSugeridos {
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  /** ISO `YYYY-MM-DD`. Se arma la fecha recién al guardar. */
  fechaNacimiento: string | null;
  sexo: SexoBiologico | null;
  notas: string | null;
}

export interface AlertaAlimentariaSugerida {
  tipo: TipoAlertaAlimentaria;
  descripcion: string;
  severidad: SeveridadAlerta;
  notas: string | null;
}

/** Medición inicial leída del documento. Solo el peso es obligatorio. */
export interface AntropometriaSugerida extends Partial<
  Omit<MedidasAntropometricas, "pesoKg">
> {
  pesoKg: number;
  /** ISO `YYYY-MM-DD`; si el documento no la trae, la resuelve el caso de uso. */
  fecha: string | null;
}

export interface LaboratorioSugerido {
  /** ISO `YYYY-MM-DD`. */
  fecha: string | null;
  titulo: string;
  notas: string | null;
}

/**
 * Todo lo que se pudo leer de la ficha, listo para PRECARGAR el alta. Nada de
 * esto está persistido: el profesional revisa y guarda.
 */
export interface FichaPacienteSugerida {
  paciente: DatosPacienteSugeridos;
  historiaClinica: Partial<CamposHistoriaClinica>;
  camposPersonalizados: CampoPersonalizadoHistoria[];
  alertas: AlertaAlimentariaSugerida[];
  antropometria: AntropometriaSugerida | null;
  laboratorios: LaboratorioSugerido[];
}

/** Un campo personalizado del consultorio, tal como se le describe a la IA. */
export interface CampoPersonalizadoPedido {
  clave: string;
  etiqueta: string;
  descripcion: string | null;
}

/**
 * Puerto que lee una ficha de paciente (PDF, Word o foto) con IA y devuelve
 * todo lo que reconoció, para dar de alta al paciente sin cargarlo a mano.
 *
 * No persiste nada: el alta la sigue haciendo el profesional desde el
 * formulario precargado. Es deliberado — el email es obligatorio y casi nunca
 * está en la ficha en papel, y un alta automática tendría que inventarlo.
 */
export interface IInterpretadorFichaPaciente {
  interpretar(
    archivo: { clave: string; mimeType: string },
    camposPersonalizados: CampoPersonalizadoPedido[],
  ): Promise<FichaPacienteSugerida>;
}
