import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { TokenRefresco } from "@/dominio/entidades/TokenRefresco";

/** Entrada del caso de uso. */
export interface EntradaEmitirTokenRefresco {
  usuarioId: string;
  /** User-Agent del dispositivo, para reconocer la sesión. Opcional. */
  dispositivo?: string | null;
  /**
   * Familia a la que pertenece. Sin esto se abre una nueva (un login); con
   * esto, la rotación sigue la cadena que ya existía.
   */
  familia?: string;
}

/** Lo que hay que guardar en la cookie, más cuándo vence. */
export interface TokenRefrescoEmitido {
  /** Valor en claro: va a la cookie y NO se persiste. */
  token: string;
  expiraEn: Date;
  familia: string;
}

/** Cuánto se guarda un User-Agent: lo justo para reconocer el dispositivo. */
const LARGO_MAXIMO_DISPOSITIVO = 200;

/**
 * Caso de uso: emitir un token de refresco.
 *
 * Lo llaman los dos extremos del ciclo: el login (abre una familia nueva) y la
 * renovación (continúa la familia del token que se acaba de canjear). Es un
 * caso de uso y no un detalle del repositorio porque la duración y el recorte
 * del dispositivo son decisiones de negocio, no de persistencia.
 *
 * `validezDias` se inyecta y no se lee de `process.env` acá: el dominio y la
 * aplicación no conocen la configuración del proceso.
 */
export class EmitirTokenRefresco {
  constructor(
    private readonly tokens: ITokenRefrescoRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly reloj: IRelojFecha,
    private readonly validezDias: number,
  ) {}

  async ejecutar(
    entrada: EntradaEmitirTokenRefresco,
  ): Promise<TokenRefrescoEmitido> {
    const ahora = this.reloj.ahora();
    const { token, hash } = this.generador.generar();
    const familia = entrada.familia ?? crypto.randomUUID();
    const expiraEn = new Date(
      ahora.getTime() + this.validezDias * 24 * 60 * 60 * 1000,
    );

    const registro = TokenRefresco.crear(
      {
        usuarioId: entrada.usuarioId,
        familia,
        tokenHash: hash,
        expiraEn,
        dispositivo: recortarDispositivo(entrada.dispositivo),
      },
      crypto.randomUUID(),
      ahora,
    );
    await this.tokens.crear(registro);

    return { token, expiraEn, familia };
  }
}

function recortarDispositivo(valor: string | null | undefined): string | null {
  const limpio = valor?.trim();
  if (!limpio) return null;
  return limpio.slice(0, LARGO_MAXIMO_DISPOSITIVO);
}
