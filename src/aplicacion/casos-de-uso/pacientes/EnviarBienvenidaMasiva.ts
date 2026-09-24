import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IGeneradorContrasenas } from "@/dominio/servicios/IGeneradorContrasenas";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";

/** Qué pasó con cada paciente del lote. */
export interface DetalleEnvioBienvenida {
  pacienteId: string;
  nombrePaciente: string;
  /**
   * `YA_ENVIADA` va aparte de `OMITIDO` porque pide otra respuesta: al que no
   * tiene email no hay nada que remandarle, al que ya la recibió sí —la
   * pantalla le ofrece reenviársela—.
   */
  estado: "ENVIADO" | "YA_ENVIADA" | "OMITIDO" | "FALLIDO";
  motivo: string | null;
}

/** Resumen del lote. */
export interface ResultadoEnvioBienvenida {
  enviados: number;
  /** Ya la tenían enviada y no se forzó: candidatos a un reenvío. */
  yaEnviadas: number;
  omitidos: number;
  fallidos: number;
  detalles: DetalleEnvioBienvenida[];
}

/**
 * De dónde sale la contraseña que viaja en la bienvenida manual cuando la
 * plantilla lleva `{{contrasena}}`: una al azar por paciente, o la que escribió
 * el profesional (la misma para todo el lote).
 */
export type ContrasenaBienvenida =
  { modo: "GENERADA" } | { modo: "MANUAL"; valor: string };

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
 * ## La contraseña
 *
 * La que eligió el profesional en el alta ya no existe: se guarda solo su
 * hash bcrypt, que no se puede revertir. Hasta acá eso hacía que el envío
 * manual mandara `{{contrasena}}` VACÍO —el paciente recibía «Contraseña:» y
 * nada—. Ahora, si la plantilla lleva `{{contrasena}}`, se usa una NUEVA, se le
 * manda y se le asigna a la cuenta: la anterior deja de funcionar y se cierran
 * sus sesiones persistentes, igual que en cualquier cambio de contraseña. Si la
 * plantilla no la lleva, no se toca la cuenta.
 *
 * La nueva la elige el profesional (`ContrasenaBienvenida`): generada al azar,
 * una distinta por paciente —la de por defecto—, o una que escribe él, que es
 * la misma para todo el lote. La FORMA de la escrita (largo, obvias) la valida
 * `passwordNuevaDto` en el borde, como en `CambiarPassword`: el caso de uso no
 * importa DTOs.
 *
 * El orden importa: primero se MANDA y después se GUARDA. Si el email falla,
 * la cuenta queda como estaba y el paciente sigue entrando con la suya; al
 * revés, un fallo del SMTP lo dejaría afuera con una contraseña que nunca le
 * llegó. El hash se calcula antes de mandar para que lo único que quede
 * entre el envío y el guardado sea la escritura.
 */
export class EnviarBienvenidaMasiva {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly enviarUno: EnviarEmailDeBienvenida,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly hasheador: IHasheadorContrasena,
    private readonly generador: IGeneradorContrasenas,
    private readonly tokensRefresco: ITokenRefrescoRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  /** Si la plantilla de bienvenida lleva `{{contrasena}}` (para la pantalla). */
  async pideContrasena(): Promise<boolean> {
    return this.enviarUno.pideContrasena();
  }

  async ejecutar(datos: {
    pacienteIds: string[];
    forzar?: boolean;
    /** Sin indicar, se genera una al azar por paciente. */
    contrasena?: ContrasenaBienvenida;
  }): Promise<ResultadoEnvioBienvenida> {
    if (datos.pacienteIds.length === 0) {
      throw new ErrorValidacion("Elegí al menos un paciente para avisar.");
    }
    // Sin `trim` al usarla: los espacios son parte de una contraseña. Solo se
    // rechaza la que no tiene nada.
    const manual =
      datos.contrasena?.modo === "MANUAL" ? datos.contrasena.valor : null;
    if (manual !== null && manual.trim() === "") {
      throw new ErrorValidacion("Escribí la contraseña que se va a enviar.");
    }
    if (datos.pacienteIds.length > MAX_PACIENTES_POR_LOTE) {
      throw new ErrorValidacion(
        `No se pueden mandar más de ${MAX_PACIENTES_POR_LOTE} bienvenidas por vez.`,
      );
    }

    const detalles: DetalleEnvioBienvenida[] = [];
    const ahora = this.reloj.ahora();
    // Una vez por lote: es la misma plantilla para todos.
    const pideContrasena = await this.enviarUno.pideContrasena();

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
          estado: "YA_ENVIADA",
          motivo: "Ya se le había enviado la bienvenida.",
        });
        continue;
      }

      try {
        let acceso: {
          cuenta: Usuario;
          contrasena: string;
          hash: string;
        } | null = null;
        if (pideContrasena) {
          const cuenta = await this.usuarios.obtenerPorPacienteId(paciente.id);
          // Sin cuenta no hay contraseña que mandar, y la plantilla la pide:
          // mandarla igual sería decirle «Contraseña:» y nada.
          if (!cuenta || !cuenta.activo) {
            detalles.push({
              pacienteId,
              nombrePaciente: paciente.nombreCompleto,
              estado: "OMITIDO",
              motivo: cuenta
                ? "Su cuenta del portal está desactivada."
                : "No tiene cuenta para entrar al portal.",
            });
            continue;
          }
          const contrasena = manual ?? this.generador.generar();
          acceso = {
            cuenta,
            contrasena,
            hash: await this.hasheador.hashear(contrasena),
          };
        }

        const enviado = await this.enviarUno.ejecutar({
          nombrePaciente: paciente.nombreCompleto,
          email: paciente.email,
          contrasena: acceso?.contrasena ?? "",
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
        // Recién ahora, con el email ya enviado, la contraseña pasa a ser la
        // de la cuenta (ver el comentario de la clase).
        if (acceso) {
          await this.usuarios.actualizar(
            acceso.cuenta.cambiarPassword(acceso.hash),
          );
          await this.tokensRefresco.revocarDeUsuario(acceso.cuenta.id, ahora);
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
      yaEnviadas: detalles.filter((d) => d.estado === "YA_ENVIADA").length,
      omitidos: detalles.filter((d) => d.estado === "OMITIDO").length,
      fallidos: detalles.filter((d) => d.estado === "FALLIDO").length,
      detalles,
    };
  }
}
