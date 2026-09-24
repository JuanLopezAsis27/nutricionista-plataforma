import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type {
  IProveedorWhatsapp,
  PlantillaWhatsappEnvio,
} from "@/dominio/servicios/IProveedorWhatsapp";
import type { IEnlaceConfirmacionTurno } from "@/dominio/servicios/IEnlaceConfirmacionTurno";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { Turno } from "@/dominio/entidades/Turno";
import type { Paciente } from "@/dominio/entidades/Paciente";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  normalizarTelefonoE164,
  PREFIJO_PAIS_POR_DEFECTO,
} from "@/dominio/servicios/telefono";
import { armarRecordatorio } from "../recordatorios/armadoRecordatorio";
import { renderizarPlantilla } from "./plantilla";
import { parametrosDeBotones } from "./plantillaMeta";

const ESTADOS_ACTIVOS = new Set(["PENDIENTE", "CONFIRMADO"]);

/**
 * Caso de uso: mandarle a un paciente, desde el chat, una plantilla aprobada.
 *
 * Es la salida cuando la ventana de 24 h está cerrada y Meta ya no acepta
 * texto libre. Los datos del turno (fecha, hora, sede) y los botones que
 * actúan sobre él se completan con el PRÓXIMO turno del paciente: una
 * plantilla que los necesita no se puede mandar a quien no tiene ninguno.
 *
 * No es un recordatorio —no entra en su log ni en su antiduplicado—: es un
 * mensaje del chat que sale por plantilla. Sí comparte con el recordatorio el
 * armado del texto y de los botones, para que el mismo molde diga lo mismo
 * por los dos caminos.
 */
export class EnviarPlantillaWhatsapp {
  constructor(
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly establecimientos: IEstablecimientoRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
    private readonly enlaces: IEnlaceConfirmacionTurno,
    private readonly reloj: IRelojFecha,
    /** Da {{profesional}}: el nombre del consultorio en curso. */
    private readonly nutricionistas: INutricionistaRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    plantillaId: string,
  ): Promise<MensajeWhatsapp> {
    const plantilla = await this.plantillas.obtenerPorId(plantillaId);
    if (!plantilla) {
      throw new ErrorPlantillaWhatsappNoEncontrada(plantillaId);
    }
    if (!plantilla.admiteEnvioPorApi) {
      throw new ErrorValidacion(
        "Esa plantilla no está aprobada en Meta: todavía no se puede mandar.",
      );
    }
    if ((await this.proveedor.modoActual()) !== "API") {
      throw new ErrorValidacion(
        "WhatsApp no está conectado a la app. Usá el botón del turno para abrir el chat.",
      );
    }
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    if (!paciente.telefono) {
      throw new ErrorValidacion("El paciente no tiene teléfono cargado.");
    }

    const turno = await this.proximoTurno(paciente.id);
    if (plantilla.necesitaTurno && !turno) {
      throw new ErrorValidacion(
        `«${plantilla.nombre}» usa los datos de un turno y ${paciente.nombreCompleto} no tiene ninguno próximo.`,
      );
    }

    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    const nombreProfesional = await this.nutricionistas.nombreDelActual();
    const { texto, envio } = turno
      ? await this.armarConTurno(
          plantilla,
          paciente,
          config,
          nombreProfesional,
          turno,
        )
      : this.armarSinTurno(plantilla, paciente, config, nombreProfesional);

    const resultado = await this.proveedor.enviarPlantilla({
      ...envio,
      botones: parametrosDeBotones(plantilla, turno, this.enlaces),
    });
    if (resultado.modo !== "API") {
      throw new ErrorValidacion("WhatsApp no está conectado a la app.");
    }

    return this.mensajes.crear(
      MensajeWhatsapp.crear(
        {
          pacienteId: paciente.id,
          direccion: "SALIENTE",
          telefono: envio.telefono,
          cuerpo: texto,
          idExterno: resultado.idExterno,
          estado: "ENVIADO",
        },
        crypto.randomUUID(),
      ),
    );
  }

  /** El turno activo más cercano, de hoy en adelante. */
  private async proximoTurno(pacienteId: string): Promise<Turno | null> {
    const hoy = this.reloj.hoy().getTime();
    const candidatos = (await this.turnos.obtenerPorPaciente(pacienteId))
      .filter((t) => ESTADOS_ACTIVOS.has(t.estado) && t.fecha.getTime() >= hoy)
      .sort(
        (a, b) =>
          a.fecha.getTime() - b.fecha.getTime() || a.hora.localeCompare(b.hora),
      );
    return candidatos[0] ?? null;
  }

  private async armarConTurno(
    plantilla: PlantillaWhatsapp,
    paciente: Paciente,
    config: ConfiguracionConsultorio,
    nombreProfesional: string,
    turno: Turno,
  ): Promise<{ texto: string; envio: PlantillaWhatsappEnvio }> {
    const sede = await this.establecimientos.obtenerPorId(
      turno.establecimientoId,
    );
    const armado = armarRecordatorio(
      turno,
      paciente,
      config,
      nombreProfesional,
      plantilla,
      sede,
    );
    if (!armado.envioPlantilla) {
      throw new ErrorValidacion("Esa plantilla no tiene nombre en Meta.");
    }
    return { texto: armado.mensaje, envio: armado.envioPlantilla };
  }

  /**
   * Sin turno solo quedan el paciente y el profesional: la plantilla no usa
   * nada más (si usara la fecha o la sede, `necesitaTurno` la habría frenado).
   */
  private armarSinTurno(
    plantilla: PlantillaWhatsapp,
    paciente: Paciente,
    config: ConfiguracionConsultorio,
    nombreProfesional: string,
  ): { texto: string; envio: PlantillaWhatsappEnvio } {
    const c = config.aPrimitivos();
    const telefono = normalizarTelefonoE164(
      paciente.telefono,
      c.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
    );
    const variables: Record<string, string> = {
      paciente: paciente.nombreCompleto,
      profesional: nombreProfesional,
    };
    const texto = renderizarPlantilla(plantilla.cuerpo, variables);
    return {
      texto,
      envio: {
        telefono,
        nombrePlantilla: plantilla.claveMeta ?? "",
        idioma: plantilla.idiomaMeta,
        parametros: plantilla.variablesMeta.map((v) => variables[v] || "-"),
        textoEquivalente: texto,
      },
    };
  }
}
