import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { RolUsuario } from "@/dominio/entidades/Usuario";
import { consultorioInicial } from "@/dominio/servicios/cuentaPaciente";

/** Lo que la sesión necesita saber de quién entra y dónde trabaja. */
export interface IdentidadDeSesion {
  id: string;
  /**
   * Con qué entra la cuenta, para mostrarlo: el email, o el nombre de usuario
   * si no tiene (migración 80). Se llama `email` porque es el campo de la
   * sesión de Auth.js, que solo se usa para mostrar.
   */
  email: string;
  rol: RolUsuario;
  /**
   * La ficha del consultorio ACTIVO. Null para el profesional, y para el
   * paciente con varios consultorios que todavía no eligió.
   */
  pacienteId: string | null;
  /** El inquilino de la sesión (el del consultorio activo, para un paciente). */
  nutricionistaId: string | null;
}

/**
 * Caso de uso: armar la identidad de la sesión, con el consultorio en el que
 * arranca.
 *
 * Es UN solo camino para los tres momentos que emiten una sesión —el login,
 * la renovación con el token de refresco y el cambio de consultorio—: si cada
 * uno lo resolviera por su cuenta, uno terminaría aceptando un consultorio que
 * los otros rechazan.
 *
 * Para un profesional no hay nada que resolver: es su propio inquilino. Para
 * un paciente, `consultorioInicial` decide con sus cuentas y la preferencia del
 * dispositivo, que SIEMPRE se revalida acá: viene de una cookie, y una cookie
 * vieja puede nombrar una ficha que ya no es suya.
 *
 * Devuelve `null` si la cuenta ya no existe.
 */
export class ResolverConsultorioActivo {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
  ) {}

  async ejecutar(
    usuarioId: string,
    pacientePreferidoId: string | null,
  ): Promise<IdentidadDeSesion | null> {
    const usuario = await this.usuarios.obtenerPorId(usuarioId);
    if (!usuario) return null;

    const base = {
      id: usuario.id,
      email: usuario.identificador,
      rol: usuario.rol,
    };
    if (!usuario.esPaciente) {
      return {
        ...base,
        pacienteId: null,
        nutricionistaId: usuario.nutricionistaId,
      };
    }

    const elegido = consultorioInicial(
      await this.cuentas.listarDeUsuario(usuario.id),
      pacientePreferidoId,
    );
    return {
      ...base,
      pacienteId: elegido?.pacienteId ?? null,
      nutricionistaId: elegido?.nutricionistaId ?? null,
    };
  }
}
