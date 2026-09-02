import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import {
  HistoriaClinica,
  type CampoPersonalizadoHistoria,
  type CamposHistoriaClinica,
} from "@/dominio/entidades/HistoriaClinica";
import {
  AlertaAlimentaria,
  type DatosNuevaAlertaAlimentaria,
} from "@/dominio/entidades/AlertaAlimentaria";
import {
  Antropometria,
  type DatosNuevaAntropometria,
} from "@/dominio/entidades/Antropometria";
import {
  Laboratorio,
  type DatosNuevoLaboratorio,
} from "@/dominio/entidades/Laboratorio";
import {
  CrearPaciente,
  type DatosNuevoPacienteConAcceso,
} from "./CrearPaciente";

/** Todo lo que el profesional confirmó del documento, listo para persistir. */
export interface DatosPacienteDesdeFicha extends DatosNuevoPacienteConAcceso {
  historiaClinica?:
    | (Partial<CamposHistoriaClinica> & {
        camposPersonalizados?: CampoPersonalizadoHistoria[];
      })
    | null;
  alertas?: Omit<DatosNuevaAlertaAlimentaria, "pacienteId">[];
  antropometria?: Omit<DatosNuevaAntropometria, "pacienteId"> | null;
  laboratorios?: Omit<DatosNuevoLaboratorio, "pacienteId">[];
  /** El documento que se leyó, para que quede en la ficha del paciente. */
  archivoId?: string | null;
}

export interface ResultadoAltaDesdeFicha {
  paciente: Paciente;
  /**
   * Lo que no se pudo guardar, en castellano y para mostrar.
   *
   * El paciente YA está creado cuando se llega acá, así que un dato accesorio
   * que no valida no puede tumbar el alta entera ni dejarla a medias en
   * silencio: se informa y el profesional lo carga a mano desde la ficha.
   */
  advertencias: string[];
}

/**
 * Caso de uso: dar de alta un paciente con todo lo que se leyó de su ficha.
 *
 * Es el alta normal (`CrearPaciente`, con su cuenta de acceso) más los
 * registros asociados que el documento traía y el profesional confirmó:
 * historia clínica, alertas alimentarias, la medición inicial y los
 * laboratorios.
 *
 * El orden importa: primero el paciente —si eso falla, no se creó nada— y
 * después cada asociado por separado. Meterlos en el mismo `try` haría que una
 * alergia mal escrita se llevara puesta la medición y la historia.
 */
export class CrearPacienteDesdeFicha {
  constructor(
    private readonly crearPacienteUC: CrearPaciente,
    private readonly historias: IHistoriaClinicaRepositorio,
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly laboratorios: ILaboratorioRepositorio,
    private readonly archivos: IArchivoRepositorio,
  ) {}

  async ejecutar(
    datos: DatosPacienteDesdeFicha,
  ): Promise<ResultadoAltaDesdeFicha> {
    const paciente = await this.crearPacienteUC.ejecutar(datos);
    const pacienteId = paciente.id;
    const advertencias: string[] = [];

    await this.intentar(advertencias, "la historia clínica", async () => {
      const historia = datos.historiaClinica;
      if (!historia) return;
      // La entidad exige al menos un campo con contenido: una historia vacía
      // simplemente no se crea, y eso no es una advertencia.
      const tieneContenido =
        Object.entries(historia).some(
          ([clave, valor]) =>
            clave !== "camposPersonalizados" &&
            typeof valor === "string" &&
            valor.trim(),
        ) || (historia.camposPersonalizados ?? []).length > 0;
      if (!tieneContenido) return;

      await this.historias.guardar(
        HistoriaClinica.crear({ ...historia, pacienteId }, crypto.randomUUID()),
      );
    });

    for (const alerta of datos.alertas ?? []) {
      await this.intentar(
        advertencias,
        `la alerta «${alerta.descripcion}»`,
        async () => {
          await this.alertas.crear(
            AlertaAlimentaria.crear(
              { ...alerta, pacienteId },
              crypto.randomUUID(),
            ),
          );
        },
      );
    }

    if (datos.antropometria) {
      const medicion = datos.antropometria;
      await this.intentar(advertencias, "la medición inicial", async () => {
        await this.antropometrias.crear(
          Antropometria.crear({ ...medicion, pacienteId }, crypto.randomUUID()),
        );
      });
    }

    for (const laboratorio of datos.laboratorios ?? []) {
      await this.intentar(
        advertencias,
        `el laboratorio «${laboratorio.titulo}»`,
        async () => {
          await this.laboratorios.crear(
            Laboratorio.crear(
              { ...laboratorio, pacienteId },
              crypto.randomUUID(),
            ),
            [],
          );
        },
      );
    }

    // El documento leído queda archivado en la ficha: es la fuente de lo que
    // se cargó, y sin esto quedaría huérfano en el bucket hasta la limpieza.
    if (datos.archivoId) {
      await this.intentar(advertencias, "el documento original", async () => {
        await this.archivos.vincularDueno(datos.archivoId as string, {
          pacienteId,
        });
      });
    }

    return { paciente, advertencias };
  }

  private async intentar(
    advertencias: string[],
    que: string,
    accion: () => Promise<void>,
  ): Promise<void> {
    try {
      await accion();
    } catch (error) {
      advertencias.push(
        `No se pudo guardar ${que}: ${error instanceof Error ? error.message : "error desconocido"}`,
      );
    }
  }
}
