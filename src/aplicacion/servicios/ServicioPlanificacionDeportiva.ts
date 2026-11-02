import type { CrearPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/CrearPlanificacion";
import type { CrearPlanificacionParaPaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/CrearPlanificacionParaPaciente";
import type { ActualizarPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ActualizarPlanificacion";
import type { EliminarPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/EliminarPlanificacion";
import type { DuplicarPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/DuplicarPlanificacion";
import type { ObtenerPlanificacionPorId } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ObtenerPlanificacionPorId";
import type { ListarPlanificaciones } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ListarPlanificaciones";
import type { MoverPlanificacionAGrupo } from "@/aplicacion/casos-de-uso/planificacion-deportiva/MoverPlanificacionAGrupo";
import type { AsignarPlanificacionAPaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/AsignarPlanificacionAPaciente";
import type { DesasignarPlanificacionDePaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/DesasignarPlanificacionDePaciente";
import type { ObtenerPlanificacionesDelPaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ObtenerPlanificacionesDelPaciente";
import type { ObtenerPacientesDePlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ObtenerPacientesDePlanificacion";
import type { CrearGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/CrearGrupoPlan";
import type { ActualizarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ActualizarGrupoPlan";
import type { EliminarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/EliminarGrupoPlan";
import type { ObtenerGruposPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ObtenerGruposPlan";
import type { CompetenciaDeAsignacion } from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import type { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import {
  cafeinaDeIngesta,
  formatearMinutos,
  horaDeIngesta,
  kmEstimadoDeIngesta,
  liquidosDeIngesta,
  macrosDeIngesta,
  type PlanificacionDeportiva,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { describirCantidad } from "@/dominio/entidades/medidasAlimento";
import type {
  ActualizarPlanificacionDto,
  AsignarPlanificacionDto,
  CompetenciaDeAsignacionSalidaDto,
  CrearPlanificacionDto,
  CrearPlanificacionParaPacienteDto,
  GrupoPlanificacionSalidaDto,
  ListarPlanificacionesDto,
  PacienteDePlanificacionDto,
  PlanificacionDelPacienteDto,
  PlanificacionesPaginadasDto,
  PlanificacionSalidaDto,
} from "../dtos/planificacionDeportiva.dto";

/**
 * Servicio de aplicación de la planificación deportiva (migración 94):
 * planificaciones, sus carpetas y sus asignaciones a pacientes.
 *
 * Las carpetas usan los MISMOS casos de uso que las de los planes
 * (`grupos-plan`), cableados con el repositorio de estas carpetas: son la
 * misma regla —nombre único, borrar no se lleva el contenido— sobre otra
 * colección.
 */
export class ServicioPlanificacionDeportiva {
  constructor(
    private readonly crearUC: CrearPlanificacion,
    private readonly crearParaPacienteUC: CrearPlanificacionParaPaciente,
    private readonly actualizarUC: ActualizarPlanificacion,
    private readonly eliminarUC: EliminarPlanificacion,
    private readonly duplicarUC: DuplicarPlanificacion,
    private readonly obtenerUC: ObtenerPlanificacionPorId,
    private readonly listarUC: ListarPlanificaciones,
    private readonly moverUC: MoverPlanificacionAGrupo,
    private readonly asignarUC: AsignarPlanificacionAPaciente,
    private readonly desasignarUC: DesasignarPlanificacionDePaciente,
    private readonly delPacienteUC: ObtenerPlanificacionesDelPaciente,
    private readonly pacientesDeUC: ObtenerPacientesDePlanificacion,
    private readonly gruposUC: ObtenerGruposPlan,
    private readonly crearGrupoUC: CrearGrupoPlan,
    private readonly actualizarGrupoUC: ActualizarGrupoPlan,
    private readonly eliminarGrupoUC: EliminarGrupoPlan,
  ) {}

  // --- Planificaciones -------------------------------------------------------

  async listar(
    datos: ListarPlanificacionesDto,
  ): Promise<PlanificacionesPaginadasDto> {
    const pagina = await this.listarUC.ejecutar({
      pagina: datos.pagina,
      porPagina: datos.porPagina,
      texto: datos.texto?.trim() || undefined,
      grupoId: datos.grupoId,
    });
    return {
      total: pagina.total,
      paginas: pagina.paginas,
      items: pagina.items.map(({ planificacion, cantidadPacientes }) => {
        const p = planificacion.aPrimitivos();
        return {
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          grupoId: p.grupoId,
          modalidad: p.carrera?.modalidad ?? null,
          distanciaKm: p.carrera?.distanciaKm ?? null,
          duracionEstimadaMin: p.carrera?.duracionEstimadaMin ?? null,
          cantidadIngestas: p.ingestas.length,
          cantidadPacientes,
          actualizadoEn: p.actualizadoEn,
        };
      }),
    };
  }

  async obtener(id: string): Promise<PlanificacionSalidaDto> {
    return aSalida(await this.obtenerUC.ejecutar(id));
  }

  async crear(datos: CrearPlanificacionDto): Promise<PlanificacionSalidaDto> {
    return aSalida(await this.crearUC.ejecutar(datos));
  }

  async crearParaPaciente(
    datos: CrearPlanificacionParaPacienteDto,
  ): Promise<PlanificacionSalidaDto> {
    return aSalida(await this.crearParaPacienteUC.ejecutar(datos));
  }

  async actualizar(
    datos: ActualizarPlanificacionDto,
  ): Promise<PlanificacionSalidaDto> {
    const { id, actualizadoEn, ...contenido } = datos;
    return aSalida(
      await this.actualizarUC.ejecutar(id, contenido, actualizadoEn),
    );
  }

  eliminar(id: string): Promise<void> {
    return this.eliminarUC.ejecutar(id);
  }

  async duplicar(id: string): Promise<PlanificacionSalidaDto> {
    return aSalida(await this.duplicarUC.ejecutar(id));
  }

  mover(planificacionId: string, grupoId: string | null): Promise<void> {
    return this.moverUC.ejecutar(planificacionId, grupoId);
  }

  // --- Carpetas --------------------------------------------------------------

  async grupos(): Promise<GrupoPlanificacionSalidaDto[]> {
    return (await this.gruposUC.ejecutar()).map(
      ({ grupo, cantidadPlanes }) => ({
        ...grupoASalida(grupo),
        cantidadPlanificaciones: cantidadPlanes,
      }),
    );
  }

  async crearGrupo(datos: {
    nombre: string;
    descripcion?: string | null;
  }): Promise<Omit<GrupoPlanificacionSalidaDto, "cantidadPlanificaciones">> {
    return grupoASalida(await this.crearGrupoUC.ejecutar(datos));
  }

  async actualizarGrupo(datos: {
    id: string;
    nombre: string;
    descripcion?: string | null;
  }): Promise<Omit<GrupoPlanificacionSalidaDto, "cantidadPlanificaciones">> {
    return grupoASalida(await this.actualizarGrupoUC.ejecutar(datos));
  }

  eliminarGrupo(id: string): Promise<void> {
    return this.eliminarGrupoUC.ejecutar(id);
  }

  // --- Asignaciones ----------------------------------------------------------

  async asignar(datos: AsignarPlanificacionDto): Promise<void> {
    await this.asignarUC.ejecutar(datos);
  }

  desasignar(planificacionId: string, pacienteId: string): Promise<void> {
    return this.desasignarUC.ejecutar(planificacionId, pacienteId);
  }

  async delPaciente(
    pacienteId: string,
  ): Promise<PlanificacionDelPacienteDto[]> {
    return (await this.delPacienteUC.ejecutar(pacienteId)).map((a) => ({
      asignadaEn: a.creadoEn,
      competencia: competenciaASalida(a.competencia),
      planificacion: aSalida(a.planificacion),
    }));
  }

  /** Cuántas tiene el paciente, sin traerlas. */
  cantidadDelPaciente(pacienteId: string): Promise<number> {
    return this.delPacienteUC.contar(pacienteId);
  }

  async pacientesDe(
    planificacionId: string,
  ): Promise<PacienteDePlanificacionDto[]> {
    return (await this.pacientesDeUC.ejecutar(planificacionId)).map((a) => ({
      pacienteId: a.pacienteId,
      nombre: a.pacienteNombre,
      apellido: a.pacienteApellido,
      asignadaEn: a.creadoEn,
      competencia: competenciaASalida(a.competencia),
    }));
  }
}

// --- Mapeo a la salida ---------------------------------------------------------

function aSalida(
  planificacion: PlanificacionDeportiva,
): PlanificacionSalidaDto {
  const p = planificacion.aPrimitivos();
  const carrera = p.carrera;
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    tipo: p.tipo,
    grupoId: p.grupoId,
    pesoReferenciaKg: p.pesoReferenciaKg,
    carrera: carrera
      ? { ...carrera, ritmoMinPorKm: planificacion.ritmoMinPorKm }
      : null,
    ingestas: p.ingestas.map((ingesta) => ({
      id: ingesta.id,
      minuto: ingesta.minuto,
      tiempo: formatearMinutos(ingesta.minuto),
      hora: horaDeIngesta(carrera?.horaLargada ?? null, ingesta.minuto),
      km: ingesta.km,
      kmEstimado:
        ingesta.km == null
          ? kmEstimadoDeIngesta(carrera, ingesta.minuto)
          : null,
      notas: ingesta.notas,
      alimentos: ingesta.alimentos.map((alimento) => ({
        id: alimento.id,
        nombre: alimento.nombre,
        cantidadGramos: alimento.cantidadGramos,
        caloriasPor100: alimento.caloriasPor100,
        proteinasPor100: alimento.proteinasPor100,
        carbohidratosPor100: alimento.carbohidratosPor100,
        grasasPor100: alimento.grasasPor100,
        cafeinaPor100: alimento.cafeinaPor100,
        fuente: alimento.fuente,
        referenciaExterna: alimento.referenciaExterna,
        alimentoOrigenId: alimento.alimentoOrigenId,
        unidadBase: alimento.unidadBase,
        medidas: alimento.medidas,
        medida: alimento.medida,
        cantidadMedida: alimento.cantidadMedida,
        cantidadPorMedida: alimento.cantidadPorMedida,
        cantidadTexto: describirCantidad(alimento),
      })),
      macros: macrosDeIngesta(ingesta),
      liquidosMl: liquidosDeIngesta(ingesta),
      cafeinaMg: cafeinaDeIngesta(ingesta),
    })),
    resumen: planificacion.resumen,
    creadoEn: p.creadoEn,
    actualizadoEn: p.actualizadoEn,
  };
}

function grupoASalida(
  grupo: GrupoPlan,
): Omit<GrupoPlanificacionSalidaDto, "cantidadPlanificaciones"> {
  const g = grupo.aPrimitivos();
  return {
    id: g.id,
    nombre: g.nombre,
    descripcion: g.descripcion,
    pacienteId: g.pacienteId,
  };
}

function competenciaASalida(
  competencia: CompetenciaDeAsignacion | null,
): CompetenciaDeAsignacionSalidaDto | null {
  return competencia ? { ...competencia } : null;
}
