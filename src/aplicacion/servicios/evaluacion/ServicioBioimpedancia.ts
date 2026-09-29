import type { RegistrarBioimpedancia } from "@/aplicacion/casos-de-uso/bioimpedancia/RegistrarBioimpedancia";
import type { ActualizarBioimpedancia } from "@/aplicacion/casos-de-uso/bioimpedancia/ActualizarBioimpedancia";
import type { EliminarBioimpedancia } from "@/aplicacion/casos-de-uso/bioimpedancia/EliminarBioimpedancia";
import type { ObtenerSeguimientoBioimpedancia } from "@/aplicacion/casos-de-uso/bioimpedancia/ObtenerSeguimientoBioimpedancia";
import type { GuardarObjetivoBioimpedancia } from "@/aplicacion/casos-de-uso/bioimpedancia/GuardarObjetivoBioimpedancia";
import type { EliminarObjetivoBioimpedancia } from "@/aplicacion/casos-de-uso/bioimpedancia/EliminarObjetivoBioimpedancia";
import type {
  RegistrarBioimpedanciaDto,
  ActualizarBioimpedanciaDto,
  GuardarObjetivoBioimpedanciaDto,
  SeguimientoBioimpedanciaDto,
  MedicionBioimpedanciaDto,
} from "../../dtos/bioimpedancia.dto";

/**
 * Servicio de aplicación de la Bioimpedancia: mediciones de la balanza y sus
 * metas. Es un subdominio aparte de `ServicioAntropometria` —otra fuente,
 * otro método— y comparte con él solo la regla de proyección, que vive en el
 * dominio.
 *
 * Como allá, cada escritura devuelve el seguimiento completo: la pestaña se
 * repinta entera con la serie y las proyecciones recalculadas.
 */
export class ServicioBioimpedancia {
  constructor(
    private readonly registrarUC: RegistrarBioimpedancia,
    private readonly actualizarUC: ActualizarBioimpedancia,
    private readonly eliminarUC: EliminarBioimpedancia,
    private readonly obtenerSeguimientoUC: ObtenerSeguimientoBioimpedancia,
    private readonly guardarObjetivoUC: GuardarObjetivoBioimpedancia,
    private readonly eliminarObjetivoUC: EliminarObjetivoBioimpedancia,
  ) {}

  async obtener(pacienteId: string): Promise<SeguimientoBioimpedanciaDto> {
    const seguimiento = await this.obtenerSeguimientoUC.ejecutar(pacienteId);
    return {
      mediciones: seguimiento.mediciones.map((medicion) => {
        const {
          creadoEn: _c,
          actualizadoEn: _a,
          ...datos
        } = medicion.aPrimitivos();
        return datos;
      }),
      objetivos: seguimiento.objetivos.map(({ objetivo, proyeccion }) => {
        const { actualizadoEn: _a, ...datos } = objetivo.aPrimitivos();
        return { ...datos, descripcion: objetivo.descripcion, proyeccion };
      }),
      valoresActuales: seguimiento.valoresActuales,
    };
  }

  /**
   * Lo que ve el paciente en su portal: la serie de mediciones, sin las
   * observaciones del profesional —son notas de trabajo, no un informe— y sin
   * las metas, que el dashboard del paciente no dibuja.
   */
  async obtenerParaPaciente(
    pacienteId: string,
  ): Promise<MedicionBioimpedanciaDto[]> {
    const { mediciones } = await this.obtener(pacienteId);
    return mediciones.map((m) => ({ ...m, observaciones: null }));
  }

  async registrar(
    datos: RegistrarBioimpedanciaDto,
  ): Promise<SeguimientoBioimpedanciaDto> {
    await this.registrarUC.ejecutar(datos);
    return this.obtener(datos.pacienteId);
  }

  async actualizar(
    datos: ActualizarBioimpedanciaDto,
  ): Promise<SeguimientoBioimpedanciaDto> {
    const { id, ...cambios } = datos;
    const medicion = await this.actualizarUC.ejecutar(id, cambios);
    return this.obtener(medicion.pacienteId);
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async guardarObjetivo(
    datos: GuardarObjetivoBioimpedanciaDto,
  ): Promise<SeguimientoBioimpedanciaDto> {
    await this.guardarObjetivoUC.ejecutar(datos);
    return this.obtener(datos.pacienteId);
  }

  async eliminarObjetivo(id: string): Promise<void> {
    await this.eliminarObjetivoUC.ejecutar(id);
  }
}
