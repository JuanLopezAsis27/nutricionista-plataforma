import { randomBytes, createHash } from "node:crypto";
import type {
  IGeneradorTokens,
  TokenGenerado,
} from "@/dominio/servicios/IGeneradorTokens";

/**
 * Implementación del generador de tokens con `node:crypto`.
 *
 * El token en claro son 32 bytes aleatorios en base64url (~43 caracteres,
 * 256 bits de entropía). Lo que se persiste es su SHA-256 en hex: si la base
 * se filtra, no se puede reconstruir el token que llegó al email del usuario.
 */
export class GeneradorTokensCrypto implements IGeneradorTokens {
  generar(): TokenGenerado {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: this.hashear(token) };
  }

  hashear(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
