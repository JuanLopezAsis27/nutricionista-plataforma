import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "../../repositorios/IEmailEnviadoRepositorio";
import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IServicioEmail } from "../../servicios/IServicioEmail";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import { EmailEnviado } from "../../entidades/EmailEnviado";
import { CLAVE_RECORDATORIO_TURNO } from "../../entidades/PlantillaEmail";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import { variablesRecordatorio } from "./variables";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Resumen del barrido de recordatorios. */
export interface ResultadoRecordatorios {
  enviados: number;
  omitidos: number; // ya tenían recordatorio (idempotencia)
  fallidos: number; // sin email o error de envío
}

/**
 * Caso de uso: enviar el recordatorio de los turnos de MAÑANA (lo dispara el
 * cron del worker).
 *
 * - Solo turnos PENDIENTE o CONFIRMADO (los cancelados/completados no molestan).
 * - Idempotente: si ya se envió el recordatorio de ese turno (registrado en
 *   emails_enviados con referenciaId = turnoId), se omite. Solo se registran
 *   los envíos exitosos, de modo que un fallo se reintenta al día siguiente.
 */
export class EnviarRecordatoriosDeTurnos {
  constructor(
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly emails: IEmailEnviadoRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly reloj: IRelojFecha,
    private readonly nombreProfesional: string,
  ) {}

  async ejecutar(): Promise<ResultadoRecordatorios> {
    const plantilla = await this.plantillas.obtenerPorClave(CLAVE_RECORDATORIO_TURNO);
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(CLAVE_RECORDATORIO_TURNO);
    }

    const manana = new Date(this.reloj.hoy().getTime() + DIA_MS);
    const turnos = await this.turnos.obtenerEnFecha(manana);

    let enviados = 0;
    let omitidos = 0;
    let fallidos = 0;

    for (const turno of turnos) {
      if (turno.estado !== "PENDIENTE" && turno.estado !== "CONFIRMADO") continue;

      if (await this.emails.yaEnviado(CLAVE_RECORDATORIO_TURNO, turno.id)) {
        omitidos += 1;
        continue;
      }

      const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
      if (!paciente || !paciente.email) {
        fallidos += 1;
        continue;
      }

      const { asunto, html } = plantilla.renderizar(
        variablesRecordatorio({
          nombrePaciente: paciente.nombreCompleto,
          fecha: turno.fecha,
          hora: turno.hora,
          nombreProfesional: this.nombreProfesional,
        }),
      );

      try {
        await this.servicioEmail.enviar({ para: paciente.email, asunto, html });
      } catch (error) {
        // No se registra: el turno vuelve a intentarse en el próximo barrido.
        console.error(`[recordatorios] falló el envío al turno ${turno.id}:`, error);
        fallidos += 1;
        continue;
      }

      await this.emails.registrar(
        EmailEnviado.crear(
          {
            plantillaClave: CLAVE_RECORDATORIO_TURNO,
            para: paciente.email,
            asunto,
            referenciaId: turno.id,
            pacienteId: paciente.id,
          },
          crypto.randomUUID(),
          this.reloj.ahora(),
        ),
      );
      enviados += 1;
    }

    return { enviados, omitidos, fallidos };
  }
}
