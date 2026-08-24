/**
 * Limitador de intentos en memoria (ventana + bloqueo temporal).
 *
 * Sirve para frenar ataques de fuerza bruta contra el login sin depender de un
 * store externo (Redis): la app corre como un único proceso Node en el VPS, así
 * que un contador en memoria es suficiente y pragmático. Se reinicia al
 * reiniciar el proceso (aceptable: solo mitiga fuerza bruta sostenida).
 *
 * Cuenta fallos por clave (ej. IP o email). Al superar `maxIntentos` dentro de
 * `ventanaMs`, la clave queda bloqueada por `bloqueoMs`. Un éxito limpia la
 * clave. El tiempo se inyecta para poder testear sin relojes reales.
 */
interface EstadoIntentos {
  /** Marcas de tiempo (ms) de los fallos dentro de la ventana. */
  fallos: number[];
  /** Instante (ms) hasta el cual la clave está bloqueada (0 = no bloqueada). */
  bloqueadaHasta: number;
}

export class LimitadorIntentos {
  private readonly estados = new Map<string, EstadoIntentos>();

  constructor(
    private readonly maxIntentos = 5,
    private readonly ventanaMs = 15 * 60 * 1000,
    private readonly bloqueoMs = 15 * 60 * 1000,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  /** ¿La clave está bloqueada ahora? Devuelve además los segundos restantes. */
  estaBloqueada(clave: string): { bloqueada: boolean; restanteSegundos: number } {
    const estado = this.estados.get(clave);
    if (!estado) return { bloqueada: false, restanteSegundos: 0 };
    const ahora = this.ahora();
    if (estado.bloqueadaHasta > ahora) {
      return {
        bloqueada: true,
        restanteSegundos: Math.ceil((estado.bloqueadaHasta - ahora) / 1000),
      };
    }
    return { bloqueada: false, restanteSegundos: 0 };
  }

  /**
   * Registra un intento fallido. Si con este fallo se alcanza el máximo dentro
   * de la ventana, bloquea la clave. Devuelve el estado de bloqueo resultante.
   */
  registrarFallo(clave: string): { bloqueada: boolean; restanteSegundos: number } {
    const ahora = this.ahora();
    const estado = this.estados.get(clave) ?? { fallos: [], bloqueadaHasta: 0 };
    // Descartar fallos fuera de la ventana.
    estado.fallos = estado.fallos.filter((t) => ahora - t < this.ventanaMs);
    estado.fallos.push(ahora);

    if (estado.fallos.length >= this.maxIntentos) {
      estado.bloqueadaHasta = ahora + this.bloqueoMs;
      estado.fallos = [];
    }
    this.estados.set(clave, estado);
    this.podar(ahora);
    return this.estaBloqueada(clave);
  }

  /** Limpia el estado de una clave (llamar tras un login exitoso). */
  registrarExito(clave: string): void {
    this.estados.delete(clave);
  }

  /** Elimina entradas ya vencidas para acotar la memoria. */
  private podar(ahora: number): void {
    if (this.estados.size < 5000) return;
    for (const [clave, estado] of this.estados) {
      const sinFallosVigentes = estado.fallos.every((t) => ahora - t >= this.ventanaMs);
      if (estado.bloqueadaHasta <= ahora && sinFallosVigentes) {
        this.estados.delete(clave);
      }
    }
  }
}

/**
 * Instancia compartida para el login (módulo singleton). Máx. 5 fallos por
 * ventana de 15 minutos → bloqueo de 15 minutos. Se aplica por IP y por email.
 */
export const limitadorLogin = new LimitadorIntentos();
