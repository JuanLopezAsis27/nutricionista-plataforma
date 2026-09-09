import type { ListarTurnosParaRecordar } from "@/aplicacion/casos-de-uso/recordatorios/ListarTurnosParaRecordar";
import type { EnviarRecordatoriosMasivos } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatoriosMasivos";
import type { EnviarRecordatoriosProgramados } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatoriosProgramados";
import type { ObtenerVistaPreviaRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/ObtenerVistaPreviaRecordatorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type {
  EnviarRecordatoriosMasivosDto,
  EnviarRecordatorioIndividualDto,
  ResultadoEnvioMasivoSalidaDto,
  ResultadoProgramadosSalidaDto,
  TurnoParaRecordarSalidaDto,
  VistaPreviaSalidaDto,
} from "../../dtos/recordatorios.dto";

/** El acto de mandar: quién entra en la lista, qué dice y por qué medio sale. */
export class ServicioEnvioRecordatorios {
  constructor(
    private readonly listarTurnosUC: ListarTurnosParaRecordar,
    private readonly enviarMasivoUC: EnviarRecordatoriosMasivos,
    private readonly enviarProgramadosUC: EnviarRecordatoriosProgramados,
    private readonly vistaPreviaUC: ObtenerVistaPreviaRecordatorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly bus: IBusEventos,
  ) {}

  async listarTurnosParaRecordar(
    dias?: number,
  ): Promise<TurnoParaRecordarSalidaDto[]> {
    return this.listarTurnosUC.ejecutar(dias);
  }

  async enviarMasivo(
    datos: EnviarRecordatoriosMasivosDto,
    usuarioId: string,
  ): Promise<ResultadoEnvioMasivoSalidaDto> {
    return this.enviarMasivoUC.ejecutar({
      turnoIds: datos.turnoIds,
      plantillaId: datos.plantillaId,
      forzar: datos.forzar,
      usuarioId,
    });
  }

  /**
   * Corrida del barrido automático, con TODOS los medios. La dispara el worker
   * por cron y también el botón "Enviar ahora" de la pantalla, que pasa
   * `ignorarHora` porque ahí la decisión ya la tomó el profesional apretando.
   */
  async enviarProgramados(
    ignorarHora = false,
  ): Promise<ResultadoProgramadosSalidaDto> {
    const resultado = await this.enviarProgramadosUC.ejecutar({ ignorarHora });

    // Aviso en tiempo real a la campana de cada nutricionista. Funciona también
    // desde el worker: el bus publica por Postgres NOTIFY, que cruza procesos.
    if (resultado.email.enviados > 0) {
      for (const nutri of await this.usuarios.listarPorRol("NUTRICIONISTA")) {
        await this.bus.publicar({
          tipo: "correo.enviado",
          usuarioId: nutri.id,
          datos: { enviados: resultado.email.enviados },
        });
      }
    }
    return resultado;
  }

  /** El texto ya armado de un turno, para retocarlo antes de mandarlo. */
  async obtenerVistaPrevia(
    turnoId: string,
    plantillaId?: string | null,
  ): Promise<VistaPreviaSalidaDto> {
    return this.vistaPreviaUC.ejecutar(turnoId, plantillaId);
  }

  /**
   * Envío a UN paciente, con el texto posiblemente retocado a mano.
   *
   * NO fuerza: abrir el diálogo es elegir el texto, no saltearse la protección
   * contra el doble envío. Antes forzaba, y el resultado era que el diálogo
   * reenviaba siempre —incluso a quien acababa de recibir el aviso— mientras la
   * casilla de reenvío decía lo contrario. Para insistir dentro del margen hay
   * que tildarla, igual que en el envío masivo.
   */
  async enviarIndividual(
    datos: EnviarRecordatorioIndividualDto,
    usuarioId: string,
  ): Promise<ResultadoEnvioMasivoSalidaDto> {
    return this.enviarMasivoUC.ejecutar({
      turnoIds: [datos.turnoId],
      plantillaId: datos.plantillaId,
      mensaje: datos.mensaje,
      forzar: datos.forzar ?? false,
      usuarioId,
    });
  }
}
