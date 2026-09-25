import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

/**
 * Caso de uso: ¿el enlace de recuperación todavía sirve? Lo pregunta la
 * página `/restablecer` al abrirse, ANTES de mostrar el formulario.
 *
 * Existe porque la página mostraba el formulario siempre y el token recién se
 * validaba al guardar: pasada la hora, el enlace «abría» igual y parecía que
 * no vencía nunca. Aplica exactamente las mismas condiciones que
 * `RestablecerPassword` —existe, no se usó, no venció y la cuenta sigue
 * activa—, pero no escribe nada.
 *
 * Solo responde sí o no, sin el motivo: igual que el error del restablecimiento,
 * no le cuenta a quien tiene un token si la cuenta existe o fue desactivada.
 */
export class VerificarTokenRecuperacion {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly tokens: ITokenRecuperacionRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(token: string): Promise<boolean> {
    const registro = await this.tokens.obtenerPorHash(
      this.generador.hashear(token),
    );
    if (!registro || !registro.estaVigente(this.reloj.ahora())) return false;
    const usuario = await this.usuarios.obtenerPorId(registro.usuarioId);
    return Boolean(usuario?.activo);
  }
}
