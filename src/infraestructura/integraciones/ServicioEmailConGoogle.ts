import type {
  IServicioEmail,
  MensajeEmail,
} from "@/dominio/servicios/IServicioEmail";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IProveedorGoogle } from "@/dominio/servicios/IProveedorGoogle";
import { obtenerAccessTokenValido } from "./tokenGoogle";

const SCOPE_GMAIL = "https://www.googleapis.com/auth/gmail.send";

/**
 * Adaptador de email que envía desde la casilla de Gmail del nutricionista si la
 * tiene conectada (con permiso de envío); si no, cae al fallback (SMTP). Corre
 * dentro del alcance del inquilino, así resuelve SU cuenta de Google.
 */
export class ServicioEmailConGoogle implements IServicioEmail {
  constructor(
    private readonly cuentas: ICuentaConectadaRepositorio,
    private readonly proveedor: IProveedorGoogle,
    private readonly fallback: IServicioEmail,
  ) {}

  async enviar(mensaje: MensajeEmail): Promise<void> {
    try {
      const cuenta = await this.cuentas.obtener("GOOGLE");
      if (cuenta && cuenta.aPrimitivos().scopes.includes(SCOPE_GMAIL)) {
        const token = await obtenerAccessTokenValido(
          cuenta,
          this.cuentas,
          this.proveedor,
        );
        await this.proveedor.enviarEmail(token, {
          de: cuenta.emailCuenta,
          para: mensaje.para,
          asunto: mensaje.asunto,
          html: mensaje.html,
        });
        return;
      }
    } catch (error) {
      console.error("[gmail] falló el envío por Gmail, se usa SMTP:", error);
    }
    await this.fallback.enviar(mensaje);
  }
}
