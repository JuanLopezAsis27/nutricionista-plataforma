import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";

/** Qué pasó con cada paciente del lote. */
export interface DetalleEnvioBienvenida {
  pacienteId: string;
  nombrePaciente: string;
  estado: "ENVIADO" | "OMITIDO" | "FALLIDO";
  motivo: string | null;
}

/** Resumen del lote. */
export interface ResultadoEnvioBienvenida {
  enviados: number;
  omitidos: number;
  fallidos: number;
  detalles: DetalleEnvioBienvenida[];
}

/** Tope de pacientes por lote: más que eso es un barrido, no una selección. */
export const MAX_PACIENTES_POR_LOTE = 100;

/**
 * Caso de uso: mandar (o remandar) el email de bienvenida a una selección de
 * pacientes desde el listado, sin pasar por el alta.
 *
 * Es el envío MANUAL: por defecto omite a quien ya lo tenga registrado como
 * enviado (protección contra el doble envío), salvo que el profesional pida
 * `forzar` porque sabe que está insistiendo a propósito.
 *
 * La contraseña en texto plano solo existe durante el alta (ver
 * EnviarEmailDeBienvenida): un reenvío manual no puede llevarla, así que si la
 * plantilla usa {{contrasena}} le sale vacío. Es un límite de seguridad
 * deliberado, no un olvido.
 */
export class EnviarBienvenidaMasiva {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly enviarUno: EnviarEmailDeBienvenida,
  ) {}

  async ejecutar(datos: {
    pacienteIds: string[];
    forzar?: boolean;
  }): Promise<ResultadoEnvioBienvenida> {
    if (datos.pacienteIds.length === 0) {
      throw new ErrorValidacion("Elegí al menos un paciente para avisar.");
    }
    if (datos.pacienteIds.length > MAX_PACIENTES_POR_LOTE) {
      throw new ErrorValidacion(
        `No se pueden mandar más de ${MAX_PACIENTES_POR_LOTE} bienvenidas por vez.`,
      );
    }

    const detalles: DetalleEnvioBienvenida[] = [];
    const ahora = new Date();

    for (const pacienteId of datos.pacienteIds) {
      const paciente = await this.pacientes.obtenerPorId(pacienteId);
      if (!paciente) {
        detalles.push({
          pacienteId,
          nombrePaciente: "—",
          estado: "FALLIDO",
          motivo: "El paciente ya no existe.",
        });
        continue;
      }

      if (paciente.bienvenidaEnviadaEn && !datos.forzar) {
        detalles.push({
          pacienteId,
          nombrePaciente: paciente.nombreCompleto,
          estado: "OMITIDO",
          motivo: "Ya se le había enviado la bienvenida.",
        });
        continue;
      }

      try {
        const enviado = await this.enviarUno.ejecutar({
          nombrePaciente: paciente.nombreCompleto,
          email: paciente.email,
          contrasena: "",
        });
        if (!enviado) {
          detalles.push({
            pacienteId,
            nombrePaciente: paciente.nombreCompleto,
            estado: "OMITIDO",
            motivo: "No tiene email o no hay plantilla de bienvenida.",
          });
          continue;
        }
        await this.pacientes.actualizar(
          paciente.marcarBienvenidaEnviada(ahora),
        );
        detalles.push({
          pacienteId,
          nombrePaciente: paciente.nombreCompleto,
          estado: "ENVIADO",
          motivo: null,
        });
      } catch (error) {
        detalles.push({
          pacienteId,
          nombrePaciente: paciente.nombreCompleto,
          estado: "FALLIDO",
          motivo: error instanceof Error ? error.message : "Error desconocido.",
        });
      }
    }

    return {
      enviados: detalles.filter((d) => d.estado === "ENVIADO").length,
      omitidos: detalles.filter((d) => d.estado === "OMITIDO").length,
      fallidos: detalles.filter((d) => d.estado === "FALLIDO").length,
      detalles,
    };
  }
}
