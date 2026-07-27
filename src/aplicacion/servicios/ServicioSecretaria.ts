import type { ListarPlantillas } from "@/dominio/casos-de-uso/secretaria/ListarPlantillas";
import type { ObtenerPlantilla } from "@/dominio/casos-de-uso/secretaria/ObtenerPlantilla";
import type { CrearPlantilla } from "@/dominio/casos-de-uso/secretaria/CrearPlantilla";
import type { ActualizarPlantilla } from "@/dominio/casos-de-uso/secretaria/ActualizarPlantilla";
import type { EliminarPlantilla } from "@/dominio/casos-de-uso/secretaria/EliminarPlantilla";
import type {
  EnviarEmailDePrueba,
  ResultadoPrueba,
} from "@/dominio/casos-de-uso/secretaria/EnviarEmailDePrueba";
import type {
  EnviarRecordatoriosDeTurnos,
  ResultadoRecordatorios,
} from "@/dominio/casos-de-uso/secretaria/EnviarRecordatoriosDeTurnos";
import type { ListarEmailsEnviados } from "@/dominio/casos-de-uso/secretaria/ListarEmailsEnviados";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import type { EmailEnviado } from "@/dominio/entidades/EmailEnviado";
import type {
  CrearPlantillaDto,
  ActualizarPlantillaDto,
  EnviarPruebaDto,
  PlantillaSalidaDto,
  EmailEnviadoSalidaDto,
} from "../dtos/secretaria.dto";

/**
 * Servicio de aplicación de Secretaría: plantillas de email, envío de
 * recordatorios de turnos y de emails de prueba, y auditoría de envíos.
 */
export class ServicioSecretaria {
  constructor(
    private readonly listarPlantillasUC: ListarPlantillas,
    private readonly obtenerPlantillaUC: ObtenerPlantilla,
    private readonly crearPlantillaUC: CrearPlantilla,
    private readonly actualizarPlantillaUC: ActualizarPlantilla,
    private readonly eliminarPlantillaUC: EliminarPlantilla,
    private readonly enviarPruebaUC: EnviarEmailDePrueba,
    private readonly enviarRecordatoriosUC: EnviarRecordatoriosDeTurnos,
    private readonly listarEmailsUC: ListarEmailsEnviados,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly bus: IBusEventos,
  ) {}

  // --- Plantillas ----------------------------------------------------------

  async listarPlantillas(): Promise<PlantillaSalidaDto[]> {
    const plantillas = await this.listarPlantillasUC.ejecutar();
    return plantillas.map(ServicioSecretaria.plantillaASalida);
  }

  async obtenerPlantilla(id: string): Promise<PlantillaSalidaDto> {
    return ServicioSecretaria.plantillaASalida(await this.obtenerPlantillaUC.ejecutar(id));
  }

  async crearPlantilla(datos: CrearPlantillaDto): Promise<PlantillaSalidaDto> {
    return ServicioSecretaria.plantillaASalida(await this.crearPlantillaUC.ejecutar(datos));
  }

  async actualizarPlantilla(datos: ActualizarPlantillaDto): Promise<PlantillaSalidaDto> {
    return ServicioSecretaria.plantillaASalida(await this.actualizarPlantillaUC.ejecutar(datos));
  }

  async eliminarPlantilla(id: string): Promise<void> {
    await this.eliminarPlantillaUC.ejecutar(id);
  }

  // --- Envíos --------------------------------------------------------------

  async enviarEmailDePrueba(datos: EnviarPruebaDto): Promise<ResultadoPrueba> {
    return this.enviarPruebaUC.ejecutar(datos.plantillaId, datos.para);
  }

  async enviarRecordatorios(): Promise<ResultadoRecordatorios> {
    const resultado = await this.enviarRecordatoriosUC.ejecutar();
    // Aviso de correo en tiempo real: si se envió al menos un recordatorio,
    // se empuja a la campana de cada nutricionista (funciona también desde el
    // worker: el bus publica por Postgres NOTIFY, que cruza procesos).
    if (resultado.enviados > 0) {
      const nutris = await this.usuarios.listarPorRol("NUTRICIONISTA");
      for (const nutri of nutris) {
        await this.bus.publicar({
          tipo: "correo.enviado",
          usuarioId: nutri.id,
          datos: { enviados: resultado.enviados },
        });
      }
    }
    return resultado;
  }

  async listarEmailsRecientes(limite?: number): Promise<EmailEnviadoSalidaDto[]> {
    const emails = await this.listarEmailsUC.ejecutar(limite);
    return emails.map((e) => e.aPrimitivos());
  }

  private static plantillaASalida(plantilla: PlantillaEmail): PlantillaSalidaDto {
    return plantilla.aPrimitivos();
  }
}
