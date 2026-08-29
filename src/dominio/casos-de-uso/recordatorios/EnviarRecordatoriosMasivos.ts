import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "../../repositorios/IPlantillaWhatsappRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "../../repositorios/IConfiguracionRecordatoriosRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { Paciente } from "../../entidades/Paciente";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { ConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { ErrorPlantillaWhatsappNoEncontrada } from "../../errores/ErrorPlantillaWhatsappNoEncontrada";
import { EnviarRecordatorioWhatsapp } from "./EnviarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";

/** Qué pasó con cada turno del lote. */
export interface DetalleEnvioMasivo {
  turnoId: string;
  pacienteId: string;
  nombrePaciente: string;
  estado: "ENVIADO" | "PREPARADO" | "OMITIDO" | "FALLIDO";
  motivo: string | null;
  /** Enlace wa.me a abrir, cuando el consultorio no tiene la API conectada. */
  enlace: string | null;
  /** Si a ese paciente además le salió el recordatorio por email. */
  emailEnviado: boolean;
}

/** Resumen del lote. */
export interface ResultadoEnvioMasivo {
  enviados: number;
  preparados: number;
  omitidos: number;
  fallidos: number;
  /** Cuántos recibieron además el recordatorio por email. */
  emailsEnviados: number;
  detalles: DetalleEnvioMasivo[];
}

/** Tope de turnos por lote: más que eso es un barrido, no una selección. */
export const MAX_TURNOS_POR_LOTE = 100;

/**
 * Caso de uso: mandar el recordatorio a una selección de turnos, por TODOS los
 * medios que el consultorio tenga activos.
 *
 * Es el envío MANUAL: el profesional mira la lista de turnos próximos, tilda a
 * quiénes avisarles y dispara. Que mande también por email no es un extra: el
 * profesional que tilda pacientes y aprieta "Enviar" espera que salga el aviso,
 * no que salga por un medio y por el otro no.
 *
 * Los envíos van con `diasAntes` en null —no corresponden a ningún escalón de
 * la programación— y por eso `forzar` existe: por defecto se omite a quien ya
 * recibió el aviso, que es la protección pedida contra el doble envío, pero el
 * profesional que sabe que está insistiendo a propósito tiene cómo decirlo.
 *
 * Devuelve el detalle turno por turno y no un contador: cuando el consultorio
 * trabaja con el enlace wa.me, cada envío es un chat que hay que abrir, y la
 * UI necesita los enlaces uno por uno.
 */
export class EnviarRecordatoriosMasivos {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly configRecordatorios: IConfiguracionRecordatoriosRepositorio,
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly enviarUno: EnviarRecordatorioWhatsapp,
    private readonly enviarEmail: EnviarRecordatoriosPorEmail,
  ) {}

  async ejecutar(datos: {
    turnoIds: string[];
    plantillaId?: string | null;
    forzar?: boolean;
    usuarioId: string;
    /** Texto retocado a mano; solo tiene sentido con UN turno seleccionado. */
    mensaje?: string | null;
  }): Promise<ResultadoEnvioMasivo> {
    if (datos.turnoIds.length === 0) {
      throw new ErrorValidacion("Elegí al menos un turno para avisar.");
    }
    if (datos.turnoIds.length > MAX_TURNOS_POR_LOTE) {
      throw new ErrorValidacion(
        `No se pueden mandar más de ${MAX_TURNOS_POR_LOTE} recordatorios por vez.`,
      );
    }

    const preferencias =
      (await this.configRecordatorios.obtener()) ??
      ConfiguracionRecordatorios.porDefecto();
    if (!preferencias.whatsappActivo && !preferencias.emailActivo) {
      throw new ErrorValidacion(
        "No hay ningún medio de recordatorio activo. Activá WhatsApp o email en Programación.",
      );
    }

    // La plantilla solo hace falta si WhatsApp está activo: con el medio
    // apagado, exigirla dejaría sin mandar un email que no la necesita.
    const plantilla = preferencias.whatsappActivo
      ? ((datos.plantillaId
          ? await this.plantillas.obtenerPorId(datos.plantillaId)
          : await this.plantillas.obtenerPredeterminada()) ?? null)
      : null;
    if (preferencias.whatsappActivo) {
      if (!plantilla) {
        throw new ErrorPlantillaWhatsappNoEncontrada(
          datos.plantillaId ?? "predeterminada",
        );
      }
      if (!plantilla.activa) {
        throw new ErrorValidacion(
          `La plantilla «${plantilla.nombre}» está desactivada.`,
        );
      }
    }

    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    // Los avisos previos de todos los turnos del lote, en una sola consulta.
    const existentes = await this.recordatorios.porTurnos(datos.turnoIds);

    const cachePacientes = new Map<string, Paciente | null>();
    const detalles: DetalleEnvioMasivo[] = [];
    // Un solo "ahora" para todo el lote: si se tomara por turno, dos pacientes
    // del mismo envío podrían caer a distinto lado del margen.
    const ahora = new Date();

    for (const turnoId of datos.turnoIds) {
      const turno = await this.turnos.obtenerPorId(turnoId);
      if (!turno) {
        detalles.push(sinPaciente(turnoId, "El turno ya no existe."));
        continue;
      }
      if (!cachePacientes.has(turno.pacienteId)) {
        cachePacientes.set(
          turno.pacienteId,
          await this.pacientes.obtenerPorId(turno.pacienteId),
        );
      }
      const paciente = cachePacientes.get(turno.pacienteId) ?? null;
      if (!paciente) {
        detalles.push(sinPaciente(turnoId, "El paciente ya no existe."));
        continue;
      }

      // El email va PRIMERO y por su cuenta: es el medio que sale solo, sin
      // depender de que el profesional después abra un chat. Que WhatsApp se
      // omita por duplicado no puede dejar al paciente sin ningún aviso.
      const emailEnviado = preferencias.emailActivo
        ? (await this.enviarEmail.enviarParaTurno(turno, null, {
            forzar: datos.forzar ?? false,
            horasEntreAvisos: preferencias.horasEntreAvisos,
            ahora,
          })) === "ENVIADO"
        : false;

      if (!preferencias.whatsappActivo || plantilla == null) {
        detalles.push({
          turnoId,
          pacienteId: paciente.id,
          nombrePaciente: paciente.nombreCompleto,
          estado: emailEnviado ? "ENVIADO" : "OMITIDO",
          motivo: emailEnviado ? null : "Ya se le había enviado el email.",
          enlace: null,
          emailEnviado,
        });
        continue;
      }

      const resultado = await this.enviarUno.ejecutar({
        turno,
        paciente,
        plantilla,
        configuracion: config,
        diasAntes: null,
        origen: "MANUAL",
        usuarioId: datos.usuarioId,
        existentes: existentes.get(turnoId) ?? [],
        forzar: datos.forzar ?? false,
        horasEntreAvisos: preferencias.horasEntreAvisos,
        ahora,
        textoManual: datos.mensaje,
      });

      detalles.push({
        turnoId,
        pacienteId: paciente.id,
        nombrePaciente: paciente.nombreCompleto,
        estado: resultado.estado,
        motivo: "motivo" in resultado ? resultado.motivo : null,
        enlace: resultado.estado === "PREPARADO" ? resultado.enlace : null,
        emailEnviado,
      });
    }

    return {
      enviados: detalles.filter((d) => d.estado === "ENVIADO").length,
      preparados: detalles.filter((d) => d.estado === "PREPARADO").length,
      omitidos: detalles.filter((d) => d.estado === "OMITIDO").length,
      fallidos: detalles.filter((d) => d.estado === "FALLIDO").length,
      emailsEnviados: detalles.filter((d) => d.emailEnviado).length,
      detalles,
    };
  }
}

function sinPaciente(turnoId: string, motivo: string): DetalleEnvioMasivo {
  return {
    turnoId,
    pacienteId: "",
    nombrePaciente: "—",
    estado: "OMITIDO",
    motivo,
    enlace: null,
    emailEnviado: false,
  };
}
