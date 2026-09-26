import { createHash, randomInt } from "node:crypto";
import type {
  CodigoInvitacionGenerado,
  IGeneradorCodigoInvitacion,
} from "@/dominio/servicios/IGeneradorCodigoInvitacion";
import {
  ALFABETO_CODIGO_INVITACION,
  LARGO_CODIGO_INVITACION,
} from "@/dominio/servicios/codigoInvitacion";

/**
 * Códigos de invitación con `node:crypto`. `randomInt` y no `Math.random`: el
 * código es una credencial. Se guarda su SHA-256 en hex, como los tokens de
 * recuperación.
 */
export class GeneradorCodigoInvitacionCrypto implements IGeneradorCodigoInvitacion {
  generar(): CodigoInvitacionGenerado {
    let codigo = "";
    for (let i = 0; i < LARGO_CODIGO_INVITACION; i += 1) {
      codigo +=
        ALFABETO_CODIGO_INVITACION[
          randomInt(ALFABETO_CODIGO_INVITACION.length)
        ];
    }
    return { codigo, hash: this.hashear(codigo) };
  }

  hashear(codigo: string): string {
    return createHash("sha256").update(codigo).digest("hex");
  }
}
