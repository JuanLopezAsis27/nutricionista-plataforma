import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IResumidorConsulta } from "@/dominio/servicios/IResumidorConsulta";
import { ResumenConsulta } from "@/dominio/entidades/ResumenConsulta";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: generar (o regenerar) el resumen de la consulta con IA.
 *
 * Resume TODAS las transcripciones listas del turno, en orden, como un solo
 * texto: lo que se resume es la consulta, y las grabaciones son los pedazos en
 * que quedó partida.
 *
 * Se dispara solo cuando termina una transcripción y también a pedido desde la
 * pantalla. Las dos puertas llaman acá: con dos caminos distintos, el botón
 * «regenerar» y el automático terminarían usando prompts distintos.
 */
export class GenerarResumenConsulta {
  constructor(
    private readonly grabaciones: IGrabacionConsultaRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly resumidor: IResumidorConsulta,
  ) {}

  /**
   * @param soloSiFalta true (el disparo automático) no regenera un resumen que
   *   ya cubre todas las transcripciones: cada regeneración cuesta una llamada
   *   al modelo, y tres grabaciones que terminan juntas dispararían tres.
   */
  async ejecutar(
    turnoId: string,
    { soloSiFalta = false }: { soloSiFalta?: boolean } = {},
  ): Promise<ResumenConsulta | null> {
    const turno = await this.turnos.obtenerPorId(turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(turnoId);
    }

    const listas = (await this.grabaciones.listarPorTurno(turnoId))
      .filter((g) => g.estado === "LISTA" && g.transcripcion != null)
      .sort((a, b) => a.orden - b.orden);

    if (listas.length === 0) {
      if (soloSiFalta) return null;
      // A pedido sí es un error visible: el profesional apretó un botón y tiene
      // que saber por qué no pasó nada.
      throw new ErrorValidacion(
        "Todavía no hay ninguna grabación transcrita de esta consulta.",
      );
    }

    const existente = await this.grabaciones.obtenerResumen(turnoId);
    if (
      soloSiFalta &&
      existente != null &&
      !existente.estaDesactualizado(listas.length)
    ) {
      return existente;
    }

    const datosTurno = turno.aPrimitivos();
    const paciente = await this.pacientes.obtenerPorId(datosTurno.pacienteId);

    const generado = await this.resumidor.resumir(
      listas.map((g) => ({ orden: g.orden, texto: g.transcripcion! })),
      {
        nombrePaciente: paciente?.nombreCompleto ?? null,
        fecha: datosTurno.fecha,
      },
    );

    // El id se reusa cuando ya había resumen: es UNO por turno, y crear otro
    // chocaría contra el índice único de `turnoId`.
    const resumen = ResumenConsulta.crear(
      {
        turnoId,
        texto: generado.texto,
        modelo: generado.modelo,
        grabacionesIncluidas: listas.length,
      },
      existente?.id ?? crypto.randomUUID(),
    );

    return this.grabaciones.guardarResumen(resumen);
  }
}
