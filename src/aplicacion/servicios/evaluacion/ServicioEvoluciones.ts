import type { RegistrarEvolucion } from "@/aplicacion/casos-de-uso/evaluacion/RegistrarEvolucion";
import type { ActualizarEvolucion } from "@/aplicacion/casos-de-uso/evaluacion/ActualizarEvolucion";
import type { EliminarEvolucion } from "@/aplicacion/casos-de-uso/evaluacion/EliminarEvolucion";
import type { ObtenerEvoluciones } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerEvoluciones";
import type { ImportarEvoluciones } from "@/aplicacion/casos-de-uso/evaluacion/ImportarEvoluciones";
import type { ObtenerCamposEvolucion } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerCamposEvolucion";
import type { GuardarCampoEvolucion } from "@/aplicacion/casos-de-uso/evaluacion/GuardarCampoEvolucion";
import type { EliminarCampoEvolucion } from "@/aplicacion/casos-de-uso/evaluacion/EliminarCampoEvolucion";
import type { Evolucion } from "@/dominio/entidades/Evolucion";
import type { CampoEvolucion } from "@/dominio/entidades/CampoEvolucion";
import type {
  RegistrarEvolucionDto,
  ActualizarEvolucionDto,
  ImportarEvolucionesDto,
  EvolucionSalidaDto,
  ResultadoImportacionEvolucionesDto,
  GuardarCampoEvolucionDto,
  CampoEvolucionSalidaDto,
} from "../../dtos/evaluacion.dto";

/**
 * Servicio de aplicación de las Evoluciones de control.
 *
 * Es un subdominio propio y no un pedazo de la historia clínica: aquella se
 * carga UNA vez y describe de dónde viene el paciente; estas se cargan en cada
 * consulta y describen cómo viene. La única pieza que comparten es la lectura
 * del documento con IA, que vive en `ServicioHistoriaClinica` porque el
 * archivo que se sube es el de la historia.
 *
 * Toda escritura devuelve la lista completa: la pantalla se repinta entera, y
 * una evolución nueva cambia el orden de las demás.
 */
export class ServicioEvoluciones {
  constructor(
    private readonly registrarUC: RegistrarEvolucion,
    private readonly actualizarUC: ActualizarEvolucion,
    private readonly eliminarUC: EliminarEvolucion,
    private readonly obtenerUC: ObtenerEvoluciones,
    private readonly importarUC: ImportarEvoluciones,
    private readonly obtenerCamposUC: ObtenerCamposEvolucion,
    private readonly guardarCampoUC: GuardarCampoEvolucion,
    private readonly eliminarCampoUC: EliminarCampoEvolucion,
  ) {}

  async obtener(pacienteId: string): Promise<EvolucionSalidaDto[]> {
    const evoluciones = await this.obtenerUC.ejecutar(pacienteId);
    return evoluciones.map(aSalida);
  }

  async registrar(datos: RegistrarEvolucionDto): Promise<EvolucionSalidaDto[]> {
    await this.registrarUC.ejecutar(datos);
    return this.obtener(datos.pacienteId);
  }

  async actualizar(
    datos: ActualizarEvolucionDto,
  ): Promise<EvolucionSalidaDto[]> {
    const { id, ...cambios } = datos;
    const evolucion = await this.actualizarUC.ejecutar(id, cambios);
    return this.obtener(evolucion.pacienteId);
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  /** Importa el lote ya revisado y devuelve el detalle más la lista nueva. */
  async importar(
    datos: ImportarEvolucionesDto,
  ): Promise<ResultadoImportacionEvolucionesDto> {
    const resultado = await this.importarUC.ejecutar(datos);
    return {
      ...resultado,
      evoluciones: await this.obtener(datos.pacienteId),
    };
  }

  // --- Campos personalizados definidos por el consultorio ---------------------

  async obtenerCampos(): Promise<CampoEvolucionSalidaDto[]> {
    const campos = await this.obtenerCamposUC.ejecutar();
    return campos.map(aSalidaCampo);
  }

  async guardarCampo(
    datos: GuardarCampoEvolucionDto,
  ): Promise<CampoEvolucionSalidaDto> {
    const campo = await this.guardarCampoUC.ejecutar(datos);
    return aSalidaCampo(campo);
  }

  async eliminarCampo(id: string): Promise<void> {
    await this.eliminarCampoUC.ejecutar(id);
  }
}

function aSalida(evolucion: Evolucion): EvolucionSalidaDto {
  return evolucion.aPrimitivos();
}

function aSalidaCampo(campo: CampoEvolucion): CampoEvolucionSalidaDto {
  const { id, clave, nombre, descripcion, orden } = campo.aPrimitivos();
  return { id, clave, nombre, descripcion, orden };
}
