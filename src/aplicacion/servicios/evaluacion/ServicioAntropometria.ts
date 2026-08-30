import type { RegistrarAntropometria } from "@/aplicacion/casos-de-uso/evaluacion/RegistrarAntropometria";
import type { ActualizarAntropometria } from "@/aplicacion/casos-de-uso/evaluacion/ActualizarAntropometria";
import type { EliminarAntropometria } from "@/aplicacion/casos-de-uso/evaluacion/EliminarAntropometria";
import type { ObtenerEvolucionAntropometrica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerEvolucionAntropometrica";
import type { ObtenerComposicionCorporal } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerComposicionCorporal";
import type { GuardarObjetivoComposicion } from "@/aplicacion/casos-de-uso/evaluacion/GuardarObjetivoComposicion";
import type { EliminarObjetivoComposicion } from "@/aplicacion/casos-de-uso/evaluacion/EliminarObjetivoComposicion";
import type { GuardarPlantillaAntropometrica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarPlantillaAntropometrica";
import type { EliminarPlantillaAntropometrica } from "@/aplicacion/casos-de-uso/evaluacion/EliminarPlantillaAntropometrica";
import type { ObtenerPlantillasAntropometricas } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerPlantillasAntropometricas";
import type { PlantillaAntropometrica } from "@/dominio/entidades/PlantillaAntropometrica";
import type {
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
} from "../../dtos/evaluacion.dto";

/**
 * Servicio de aplicación de la Medición Corporal.
 *
 * Agrupa antropometría, composición corporal y plantillas de carga. Podrían
 * parecer tres subdominios —así estaban separados por comentarios en el
 * `ServicioEvaluacion` original— pero **se llaman entre sí**: registrar una
 * medición devuelve la evolución completa, guardar un objetivo devuelve la
 * composición recalculada, y las plantillas definen qué medidas se cargan.
 *
 * Partirlos habría obligado a que un servicio dependiera de otro para
 * responderle a la UI, que es peor que tenerlos juntos: son un solo subdominio
 * con tres vistas.
 */
export class ServicioAntropometria {
  constructor(
    private readonly registrarUC: RegistrarAntropometria,
    private readonly actualizarUC: ActualizarAntropometria,
    private readonly eliminarUC: EliminarAntropometria,
    private readonly obtenerEvolucionUC: ObtenerEvolucionAntropometrica,
    private readonly obtenerComposicionUC: ObtenerComposicionCorporal,
    private readonly guardarObjetivoUC: GuardarObjetivoComposicion,
    private readonly eliminarObjetivoUC: EliminarObjetivoComposicion,
    private readonly guardarPlantillaUC: GuardarPlantillaAntropometrica,
    private readonly eliminarPlantillaUC: EliminarPlantillaAntropometrica,
    private readonly obtenerPlantillasUC: ObtenerPlantillasAntropometricas,
  ) {}

  // --- Mediciones -------------------------------------------------------------

  /** Registra y devuelve la evolución completa: la tabla se repinta entera. */
  async registrar(
    datos: RegistrarAntropometriaDto,
  ): Promise<EvolucionAntropometricaDto> {
    await this.registrarUC.ejecutar(datos);
    return this.obtenerEvolucion(datos.pacienteId);
  }

  async actualizar(
    datos: ActualizarAntropometriaDto,
  ): Promise<EvolucionAntropometricaDto> {
    const { id, ...cambios } = datos;
    const medicion = await this.actualizarUC.ejecutar(id, cambios);
    return this.obtenerEvolucion(medicion.pacienteId);
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
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

  async guardarObjetivo(
    datos: GuardarObjetivoComposicionDto,
  ): Promise<ComposicionCorporalDto> {
    await this.guardarObjetivoUC.ejecutar(datos);
    return this.obtenerComposicion(datos.pacienteId);
  }

  async eliminarObjetivo(id: string): Promise<void> {
    await this.eliminarObjetivoUC.ejecutar(id);
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
