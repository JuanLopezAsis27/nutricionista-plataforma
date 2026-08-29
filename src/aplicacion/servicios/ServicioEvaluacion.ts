import type { GuardarHistoriaClinica } from "@/dominio/casos-de-uso/evaluacion/GuardarHistoriaClinica";
import type { ObtenerHistoriaClinica } from "@/dominio/casos-de-uso/evaluacion/ObtenerHistoriaClinica";
import type { RegistrarAntropometria } from "@/dominio/casos-de-uso/evaluacion/RegistrarAntropometria";
import type { ActualizarAntropometria } from "@/dominio/casos-de-uso/evaluacion/ActualizarAntropometria";
import type { EliminarAntropometria } from "@/dominio/casos-de-uso/evaluacion/EliminarAntropometria";
import type { ObtenerEvolucionAntropometrica } from "@/dominio/casos-de-uso/evaluacion/ObtenerEvolucionAntropometrica";
import type { ObtenerComposicionCorporal } from "@/dominio/casos-de-uso/evaluacion/ObtenerComposicionCorporal";
import type { GuardarObjetivoComposicion } from "@/dominio/casos-de-uso/evaluacion/GuardarObjetivoComposicion";
import type { EliminarObjetivoComposicion } from "@/dominio/casos-de-uso/evaluacion/EliminarObjetivoComposicion";
import type { GuardarPlantillaAntropometrica } from "@/dominio/casos-de-uso/evaluacion/GuardarPlantillaAntropometrica";
import type { PlantillaAntropometrica } from "@/dominio/entidades/PlantillaAntropometrica";
import type { EliminarPlantillaAntropometrica } from "@/dominio/casos-de-uso/evaluacion/EliminarPlantillaAntropometrica";
import type { ObtenerPlantillasAntropometricas } from "@/dominio/casos-de-uso/evaluacion/ObtenerPlantillasAntropometricas";
import type { RegistrarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/RegistrarAlertaAlimentaria";
import type { ActualizarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/ActualizarAlertaAlimentaria";
import type { EliminarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/EliminarAlertaAlimentaria";
import type { ObtenerAlertasAlimentarias } from "@/dominio/casos-de-uso/evaluacion/ObtenerAlertasAlimentarias";
import type { RegistrarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/RegistrarLaboratorio";
import type { ActualizarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/ActualizarLaboratorio";
import type { EliminarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/EliminarLaboratorio";
import type { ObtenerLaboratorios } from "@/dominio/casos-de-uso/evaluacion/ObtenerLaboratorios";
import type {
  GuardarHistoriaClinicaDto,
  HistoriaClinicaSalidaDto,
  RegistrarAntropometriaDto,
  ActualizarAntropometriaDto,
  EvolucionAntropometricaDto,
  MedicionEvolucionDto,
  ComposicionCorporalDto,
  MedicionComposicionDto,
  ObjetivoComposicionDto,
  GuardarObjetivoComposicionDto,
  GuardarPlantillaAntropometricaDto,
  PlantillaAntropometricaDto,
  RegistrarAlertaAlimentariaDto,
  ActualizarAlertaAlimentariaDto,
  AlertaAlimentariaSalidaDto,
  RegistrarLaboratorioDto,
  ActualizarLaboratorioDto,
  LaboratorioSalidaDto,
} from "../dtos/evaluacion.dto";

/**
 * Servicio de aplicación de Evaluación Integral.
 * Orquesta los casos de uso de historia clínica, antropometría, alertas
 * alimentarias y laboratorios; devuelve DTOs de salida.
 */
export class ServicioEvaluacion {
  constructor(
    private readonly guardarHistoriaUC: GuardarHistoriaClinica,
    private readonly obtenerHistoriaUC: ObtenerHistoriaClinica,
    private readonly registrarAntropometriaUC: RegistrarAntropometria,
    private readonly actualizarAntropometriaUC: ActualizarAntropometria,
    private readonly eliminarAntropometriaUC: EliminarAntropometria,
    private readonly obtenerEvolucionUC: ObtenerEvolucionAntropometrica,
    private readonly obtenerComposicionUC: ObtenerComposicionCorporal,
    private readonly guardarObjetivoComposicionUC: GuardarObjetivoComposicion,
    private readonly eliminarObjetivoComposicionUC: EliminarObjetivoComposicion,
    private readonly guardarPlantillaUC: GuardarPlantillaAntropometrica,
    private readonly eliminarPlantillaUC: EliminarPlantillaAntropometrica,
    private readonly obtenerPlantillasUC: ObtenerPlantillasAntropometricas,
    private readonly registrarAlertaUC: RegistrarAlertaAlimentaria,
    private readonly actualizarAlertaUC: ActualizarAlertaAlimentaria,
    private readonly eliminarAlertaUC: EliminarAlertaAlimentaria,
    private readonly obtenerAlertasUC: ObtenerAlertasAlimentarias,
    private readonly registrarLaboratorioUC: RegistrarLaboratorio,
    private readonly actualizarLaboratorioUC: ActualizarLaboratorio,
    private readonly eliminarLaboratorioUC: EliminarLaboratorio,
    private readonly obtenerLaboratoriosUC: ObtenerLaboratorios,
  ) {}

  // --- Historia clínica -------------------------------------------------------

  async guardarHistoriaClinica(
    datos: GuardarHistoriaClinicaDto,
  ): Promise<HistoriaClinicaSalidaDto> {
    const historia = await this.guardarHistoriaUC.ejecutar(datos);
    return historia.aPrimitivos();
  }

  async obtenerHistoriaClinica(
    pacienteId: string,
  ): Promise<HistoriaClinicaSalidaDto | null> {
    const historia = await this.obtenerHistoriaUC.ejecutar(pacienteId);
    return historia ? historia.aPrimitivos() : null;
  }

  // --- Antropometría ----------------------------------------------------------

  async registrarAntropometria(
    datos: RegistrarAntropometriaDto,
  ): Promise<EvolucionAntropometricaDto> {
    await this.registrarAntropometriaUC.ejecutar(datos);
    return this.obtenerEvolucion(datos.pacienteId);
  }

  async actualizarAntropometria(
    datos: ActualizarAntropometriaDto,
  ): Promise<EvolucionAntropometricaDto> {
    const { id, ...cambios } = datos;
    const medicion = await this.actualizarAntropometriaUC.ejecutar(id, cambios);
    return this.obtenerEvolucion(medicion.pacienteId);
  }

  async eliminarAntropometria(id: string): Promise<void> {
    await this.eliminarAntropometriaUC.ejecutar(id);
  }

  async obtenerEvolucion(
    pacienteId: string,
  ): Promise<EvolucionAntropometricaDto> {
    const { mediciones, derivados } =
      await this.obtenerEvolucionUC.ejecutar(pacienteId);
    const salida: MedicionEvolucionDto[] = mediciones.map(
      (medicion, indice) => ({
        ...medicion.aPrimitivos(),
        sumatoria6Pliegues: derivados[indice]?.sumatoria6Pliegues ?? null,
        kgBajadosVsAnterior: derivados[indice]?.kgBajadosVsAnterior ?? null,
        kgBajadosAcumulados: derivados[indice]?.kgBajadosAcumulados ?? null,
      }),
    );
    return { mediciones: salida };
  }

  // --- Composición corporal ---------------------------------------------------

  async obtenerComposicion(
    pacienteId: string,
  ): Promise<ComposicionCorporalDto> {
    const composicion = await this.obtenerComposicionUC.ejecutar(pacienteId);

    const mediciones: MedicionComposicionDto[] = composicion.mediciones.map(
      ({ medicion, edadAnios, resultado }) => {
        const medidas = medicion.aPrimitivos();
        return {
          id: medidas.id,
          fecha: medidas.fecha,
          observaciones: medidas.observaciones,
          nivelActividad: medidas.nivelActividad,
          protocolo: medidas.protocolo,
          metodoGrasa: medidas.metodoGrasa,
          edadAnios,
          medidas: {
            ...medidas,
            // La ficha ya muestra estos derivados; acá van por completitud del
            // DTO de medidas, que es el mismo que usa la tabla de evolución.
            sumatoria6Pliegues: resultado.indices.sumatoria6Pliegues,
            kgBajadosVsAnterior: null,
            kgBajadosAcumulados: null,
          },
          resultado,
        };
      },
    );

    // Los kg bajados se calculan acá porque dependen de la medición anterior.
    const pesoInicial = mediciones[0]?.medidas.pesoKg ?? null;
    mediciones.forEach((actual, indice) => {
      const anterior = indice > 0 ? mediciones[indice - 1] : undefined;
      if (anterior) {
        actual.medidas.kgBajadosVsAnterior = redondear(
          anterior.medidas.pesoKg - actual.medidas.pesoKg,
        );
      }
      if (indice > 0 && pesoInicial != null) {
        actual.medidas.kgBajadosAcumulados = redondear(
          pesoInicial - actual.medidas.pesoKg,
        );
      }
    });

    const objetivos: ObjetivoComposicionDto[] = composicion.objetivos.map(
      ({ objetivo, proyeccion, proyeccionPliegues }) => ({
        ...objetivo.aPrimitivos(),
        descripcion: objetivo.descripcion,
        proyeccion,
        proyeccionPliegues,
      }),
    );

    return {
      sexo: composicion.sexo,
      fechaNacimiento: composicion.fechaNacimiento,
      mediciones,
      objetivos,
      valoresActuales: composicion.valoresActuales,
    };
  }

  async guardarObjetivoComposicion(
    datos: GuardarObjetivoComposicionDto,
  ): Promise<ComposicionCorporalDto> {
    await this.guardarObjetivoComposicionUC.ejecutar(datos);
    return this.obtenerComposicion(datos.pacienteId);
  }

  async eliminarObjetivoComposicion(id: string): Promise<void> {
    await this.eliminarObjetivoComposicionUC.ejecutar(id);
  }

  // --- Plantillas de carga ----------------------------------------------------

  async obtenerPlantillas(): Promise<PlantillaAntropometricaDto[]> {
    const plantillas = await this.obtenerPlantillasUC.ejecutar();
    return plantillas.map(aPlantillaDto);
  }

  async guardarPlantilla(
    datos: GuardarPlantillaAntropometricaDto,
  ): Promise<PlantillaAntropometricaDto[]> {
    await this.guardarPlantillaUC.ejecutar(datos);
    return this.obtenerPlantillas();
  }

  async eliminarPlantilla(id: string): Promise<void> {
    await this.eliminarPlantillaUC.ejecutar(id);
  }

  // --- Alertas alimentarias ---------------------------------------------------

  async registrarAlerta(
    datos: RegistrarAlertaAlimentariaDto,
  ): Promise<AlertaAlimentariaSalidaDto> {
    const alerta = await this.registrarAlertaUC.ejecutar(datos);
    return alerta.aPrimitivos();
  }

  async actualizarAlerta(
    datos: ActualizarAlertaAlimentariaDto,
  ): Promise<AlertaAlimentariaSalidaDto> {
    const { id, ...cambios } = datos;
    const alerta = await this.actualizarAlertaUC.ejecutar(id, cambios);
    return alerta.aPrimitivos();
  }

  async eliminarAlerta(id: string): Promise<void> {
    await this.eliminarAlertaUC.ejecutar(id);
  }

  async obtenerAlertas(
    pacienteId: string,
  ): Promise<AlertaAlimentariaSalidaDto[]> {
    const alertas = await this.obtenerAlertasUC.ejecutar(pacienteId);
    return alertas.map((alerta) => alerta.aPrimitivos());
  }

  // --- Laboratorios -------------------------------------------------------------

  async registrarLaboratorio(
    datos: RegistrarLaboratorioDto,
  ): Promise<LaboratorioSalidaDto> {
    const laboratorio = await this.registrarLaboratorioUC.ejecutar(datos);
    return laboratorio.aPrimitivos();
  }

  async actualizarLaboratorio(
    datos: ActualizarLaboratorioDto,
  ): Promise<LaboratorioSalidaDto> {
    const { id, ...cambios } = datos;
    const laboratorio = await this.actualizarLaboratorioUC.ejecutar(
      id,
      cambios,
    );
    return laboratorio.aPrimitivos();
  }

  async eliminarLaboratorio(id: string): Promise<void> {
    await this.eliminarLaboratorioUC.ejecutar(id);
  }

  async obtenerLaboratorios(
    pacienteId: string,
  ): Promise<LaboratorioSalidaDto[]> {
    const laboratorios = await this.obtenerLaboratoriosUC.ejecutar(pacienteId);
    return laboratorios.map((laboratorio) => laboratorio.aPrimitivos());
  }
}

/**
 * Plantilla → DTO. El alcance (qué resultados habilita) lo calcula la entidad
 * y viaja con ella: la UI lo muestra al elegir plantilla, sin recalcularlo.
 */
function aPlantillaDto(
  plantilla: PlantillaAntropometrica,
): PlantillaAntropometricaDto {
  const props = plantilla.aPrimitivos();
  return {
    id: props.id,
    nombre: props.nombre,
    descripcion: props.descripcion,
    campos: props.campos,
    alcance: plantilla.alcance(),
    creadoEn: props.creadoEn,
  };
}

/** Dos decimales, como en la planilla de kg bajados. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
