import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Cifrador simétrico de tokens con AES-256-GCM.
 *
 * Se usa para guardar en la base los tokens OAuth de cuentas externas
 * (Google Calendar/Gmail) CIFRADOS, nunca en claro. La clave se deriva de
 * `TOKENS_SECRET` con scrypt. El formato de salida es
 *   base64(iv).base64(authTag).base64(cifrado)
 * de modo que cada cifrado lleva su propio IV (aleatorio) y su etiqueta de
 * autenticación (detecta manipulaciones).
 *
 * La integración OAuth en sí queda para más adelante (Fase futura); este
 * componente ya está listo y probado.
 */
export class CifradorTokens {
  private readonly clave: Buffer;

  constructor(secreto: string | undefined = process.env.TOKENS_SECRET) {
    if (!secreto || secreto.length < 16) {
      throw new Error(
        "Falta TOKENS_SECRET (o es demasiado corto) para cifrar los tokens de integraciones.",
      );
    }
    // Deriva una clave de 32 bytes determinística a partir del secreto.
    this.clave = scryptSync(secreto, "nutricionista-tokens", 32);
  }

  /** Cifra un texto y devuelve un string transportable (iv.tag.cifrado). */
  cifrar(textoPlano: string): string {
    const iv = randomBytes(12); // 96 bits, recomendado para GCM
    const cipher = createCipheriv("aes-256-gcm", this.clave, iv);
    const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("base64"), tag.toString("base64"), cifrado.toString("base64")].join(".");
  }

  /** Descifra un string producido por `cifrar`. Lanza si fue manipulado. */
  descifrar(cifrado: string): string {
    const partes = cifrado.split(".");
    if (partes.length !== 3) {
      throw new Error("Token cifrado con formato inválido.");
    }
    const [ivB64, tagB64, datosB64] = partes as [string, string, string];
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const datos = Buffer.from(datosB64, "base64");

    const decipher = createDecipheriv("aes-256-gcm", this.clave, iv);
    decipher.setAuthTag(tag);
    const plano = Buffer.concat([decipher.update(datos), decipher.final()]);
    return plano.toString("utf8");
  }
}
