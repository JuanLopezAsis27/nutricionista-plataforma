import type {
  ConsultorioDeCuenta,
  ICuentaPacienteRepositorio,
} from "@/dominio/repositorios/ICuentaPacienteRepositorio";

/**
 * Caso de uso: los consultorios donde se atiende la persona, para elegir en
 * cuál trabajar (la pantalla «Elegí tu consultorio» y el selector del portal).
 *
 * El `usuarioId` sale siempre de la sesión: no hay forma de pedir los
 * consultorios de otra cuenta.
 */
export class ListarMisConsultorios {
  constructor(private readonly cuentas: ICuentaPacienteRepositorio) {}

  async ejecutar(usuarioId: string): Promise<ConsultorioDeCuenta[]> {
    return this.cuentas.listarDeUsuario(usuarioId);
  }
}
