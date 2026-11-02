import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IUbicacionArchivosRepositorio } from "@/dominio/repositorios/IUbicacionArchivosRepositorio";
import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type {
  CompetenciaDeAsignacion,
  IAsignacionPlanificacionRepositorio,
} from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import {
  CARPETA_SIN_PACIENTE,
  carpetaDePaciente,
  rutasDeArchivo,
  RutasUnicas,
  segmento,
} from "@/dominio/servicios/rutasRespaldo";

/** Un paciente en el respaldo: su carpeta y lo que se GENERA para él. */
export interface PacienteEnRespaldo {
  id: string;
  carpeta: string;
  evaluacion: string;
  mediciones: string;
  diario: string;
  /**
   * Los planes cargados en la app (modalidad APP), que no tienen archivo y
   * hay que dibujar en PDF. Los de modalidad PDF ya SON archivos y viajan en
   * `archivos`, como cualquier otro.
   */
  planes: { planId: string; ruta: string }[];
  /**
   * Sus planificaciones deportivas, que se dibujan en PDF como las ve en su
   * portal: con la competencia para la que se la asignaron.
   */
  planificaciones: PlanificacionEnRespaldo[];
}

export interface PlanificacionEnRespaldo {
  planificacionId: string;
  ruta: string;
  competencia: CompetenciaDeAsignacion | null;
}

export interface IndiceRespaldo {
  /** Ordenados por carpeta (apellido y nombre). */
  pacientes: PacienteEnRespaldo[];
  /** Un archivo del bucket puede ir a varias rutas: un plan compartido. */
  archivos: { archivoId: string; ruta: string }[];
  /**
   * Las planificaciones deportivas que no tiene nadie (las generales sin
   * asignar): son trabajo del profesional y van a «Sin paciente».
   */
  planificacionesSinPaciente: { planificacionId: string; ruta: string }[];
}

/**
 * Caso de uso: el índice del respaldo del consultorio — QUÉ va en el ZIP y en
 * qué ruta. No lee contenidos: el que arma el ZIP recorre el índice y va
 * pidiendo cada cosa recién cuando le toca, para no tener el consultorio
 * entero en memoria.
 *
 * Incluye a los pacientes archivados: un respaldo que se los saltee no
 * respalda nada que se haya dejado de atender.
 */
export class ArmarIndiceRespaldo {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
    private readonly archivos: IUbicacionArchivosRepositorio,
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
    private readonly asignacionesPlanificacion: IAsignacionPlanificacionRepositorio,
  ) {}

  async ejecutar(): Promise<IndiceRespaldo> {
    const rutas = new RutasUnicas();
    const pacientes = await this.pacientes.listar({ incluirArchivados: true });

    const carpetas = new Map<string, string>();
    const enRespaldo: PacienteEnRespaldo[] = [];
    const planificacionesAsignadas = new Set<string>();
    for (const paciente of pacientes) {
      const carpeta = rutas.reservarCarpeta(
        carpetaDePaciente({
          nombre: paciente.nombre,
          apellido: paciente.apellido,
          archivado: paciente.estaArchivado,
        }),
      );
      carpetas.set(paciente.id, carpeta);

      const planes = await this.asignaciones.listarPlanesDePaciente(
        paciente.id,
      );
      const planificaciones =
        await this.asignacionesPlanificacion.listarDePaciente(paciente.id);
      for (const a of planificaciones) {
        planificacionesAsignadas.add(a.planificacionId);
      }
      enRespaldo.push({
        id: paciente.id,
        carpeta,
        evaluacion: rutas.reservar(`${carpeta}/Evaluación.pdf`),
        mediciones: rutas.reservar(`${carpeta}/Mediciones.xlsx`),
        diario: rutas.reservar(`${carpeta}/Diario.xlsx`),
        planes: planes
          .filter((plan) => plan.modalidad === "APP")
          .map((plan) => ({
            planId: plan.id,
            ruta: rutas.reservar(
              `${carpeta}/Planes/${segmento(plan.nombre)}.pdf`,
            ),
          })),
        planificaciones: planificaciones.map((a) => ({
          planificacionId: a.planificacionId,
          ruta: rutas.reservar(
            `${carpeta}/Planificaciones deportivas/${segmento(a.planificacion.nombre)}.pdf`,
          ),
          competencia: a.competencia,
        })),
      });
    }

    const planificacionesSinPaciente = (await this.planificaciones.listar())
      .filter((p) => !planificacionesAsignadas.has(p.id))
      .map((p) => ({
        planificacionId: p.id,
        ruta: rutas.reservar(
          `${CARPETA_SIN_PACIENTE}/Planificaciones deportivas/${segmento(p.nombre)}.pdf`,
        ),
      }));

    const archivos = (await this.archivos.listar()).flatMap((archivo) =>
      rutasDeArchivo(archivo, carpetas).map((ruta) => ({
        archivoId: archivo.id,
        ruta: rutas.reservar(ruta),
      })),
    );

    enRespaldo.sort((a, b) => a.carpeta.localeCompare(b.carpeta, "es"));
    return { pacientes: enRespaldo, archivos, planificacionesSinPaciente };
  }
}
