import { Resolver } from "node:dns/promises";
import type { IVerificadorDominioEmail } from "@/dominio/servicios/IVerificadorDominioEmail";

/** Códigos de DNS que dicen «no existe», y no «no pude preguntar». */
const NO_EXISTE = new Set(["ENOTFOUND", "ENODATA"]);

/**
 * Verifica el dominio de un email por DNS: registros MX y, si no tiene, un A
 * o AAAA (sin MX, el correo se entrega a la dirección del dominio — RFC 5321,
 * «MX implícito»).
 *
 * Timeout corto y un solo intento: corre durante el alta de un paciente, y
 * un DNS lento no puede demorar esa pantalla. Si no contesta, `null`: no se
 * sabe, y se manda igual.
 */
export class VerificadorDominioEmailDns implements IVerificadorDominioEmail {
  private readonly resolver = new Resolver({ timeout: 3000, tries: 1 });

  async recibeCorreo(email: string): Promise<boolean | null> {
    const dominio = email.split("@")[1]?.trim().toLowerCase();
    if (!dominio) return false;

    const mx = await this.consultar(() => this.resolver.resolveMx(dominio));
    if (mx === null) return null;
    // Un MX nulo (RFC 7505: prioridad 0 y destino ".") dice explícitamente
    // que el dominio NO recibe correo.
    const utiles = mx.filter((r) => r.exchange && r.exchange !== ".");
    if (utiles.length > 0) return true;
    if (mx.length > 0) return false;

    const [a, aaaa] = await Promise.all([
      this.consultar(() => this.resolver.resolve4(dominio)),
      this.consultar(() => this.resolver.resolve6(dominio)),
    ]);
    if (a === null && aaaa === null) return null;
    return (a?.length ?? 0) > 0 || (aaaa?.length ?? 0) > 0;
  }

  /** Lo que respondió el DNS; vacío si dijo «no existe», null si falló. */
  private async consultar<T>(
    pregunta: () => Promise<T[]>,
  ): Promise<T[] | null> {
    try {
      return await pregunta();
    } catch (error) {
      const codigo = (error as { code?: string }).code ?? "";
      return NO_EXISTE.has(codigo) ? [] : null;
    }
  }
}
