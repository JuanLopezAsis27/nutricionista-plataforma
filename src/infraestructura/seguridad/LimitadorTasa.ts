/**
 * Limitador de TASA por ventana deslizante (en memoria).
 *
 * Hermano de `LimitadorIntentos`, y distinto a propósito: aquel cuenta FALLOS
 * (sirve para el login, donde el éxito limpia el contador), este cuenta
 * OPERACIONES, exitosas o no. Es lo que hace falta cuando el abuso no está en
 * equivocarse muchas veces sino en acertar muchas veces:
 *
 *   - pedir el enlace de recuperación mil veces con el email de la víctima
 *     (cada pedido es "correcto" y manda un mail);
 *   - inyectar errores falsos en el endpoint público de monitoreo;
 *   - llamar al asistente de IA en bucle, que cuesta plata de verdad.
 *
 * Ventana deslizante y no ventana fija: con ventana fija se pueden meter dos
 * ráfagas completas a caballo del corte (una al final de una ventana y otra al
 * principio de la siguiente) y pasar el doble del límite en un instante.
 *
 * Vive en memoria del proceso, con las mismas limitaciones que
 * `LimitadorIntentos`: se pierde al reiniciar y no se comparte entre réplicas.
 * Es una mitigación, no una garantía; la garantía la da `limit_req` de nginx
 * (ver docs/nginx.conf.ejemplo), que está por delante y sobrevive al reinicio.
 */
export class LimitadorTasa {
  /** Marcas de tiempo (ms) de las operaciones vigentes, por clave. */
  private readonly eventos = new Map<string, number[]>();

  constructor(
    private readonly maxOperaciones: number,
    private readonly ventanaMs: number,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  /**
   * Registra una operación y dice si estaba permitida.
   *
   * Cuando devuelve `permitido: false` la operación NO se contabiliza: si no,
   * quien insiste durante el bloqueo extendería su propio castigo para siempre
   * y la ventana no terminaría de vaciarse nunca.
   */
  intentar(clave: string): {
    permitido: boolean;
    reintentarEnSegundos: number;
  } {
    const ahora = this.ahora();
    const vigentes = (this.eventos.get(clave) ?? []).filter(
      (t) => ahora - t < this.ventanaMs,
    );

    if (vigentes.length >= this.maxOperaciones) {
      this.eventos.set(clave, vigentes);
      const masViejo = vigentes[0]!;
      return {
        permitido: false,
        reintentarEnSegundos: Math.max(
          1,
          Math.ceil((this.ventanaMs - (ahora - masViejo)) / 1000),
        ),
      };
    }

    vigentes.push(ahora);
    this.eventos.set(clave, vigentes);
    this.podar(ahora);
    return { permitido: true, reintentarEnSegundos: 0 };
  }

  /** Limpia el estado de una clave (usado por los tests). */
  reiniciar(clave?: string): void {
    if (clave === undefined) this.eventos.clear();
    else this.eventos.delete(clave);
  }

  /** Elimina claves sin eventos vigentes para acotar la memoria. */
  private podar(ahora: number): void {
    if (this.eventos.size < 5000) return;
    for (const [clave, marcas] of this.eventos) {
      if (marcas.every((t) => ahora - t >= this.ventanaMs)) {
        this.eventos.delete(clave);
      }
    }
  }
}

/**
 * Recuperación de contraseña: 3 pedidos por hora y por clave (email o IP).
 *
 * El número sale del uso real: alguien que se olvidó la contraseña pide el
 * enlace una vez, capaz dos si el mail tarda. Tres por hora no molesta a nadie
 * y corta el bombardeo de correo, que además de acosar a la víctima quema la
 * cuota del SMTP y puede terminar con el dominio en listas negras — rompiendo
 * TODOS los emails de la app, no solo estos.
 */
export const limitadorRecuperacion = new LimitadorTasa(3, 60 * 60 * 1000);

/**
 * Canje del token de recuperación: 10 por hora y por IP.
 *
 * Más holgado que el de pedido del enlace a propósito: acá no se manda ningún
 * correo, y quien está eligiendo contraseña nueva puede tener que reintentar
 * (se le venció el enlace, abrió el mail viejo, se equivocó de pestaña). El
 * tope existe para que nadie pruebe tokens a máxima velocidad, no para
 * racionar un recurso caro.
 */
export const limitadorRestablecer = new LimitadorTasa(10, 60 * 60 * 1000);

/**
 * Ingesta de errores del cliente: 20 por minuto y por IP.
 *
 * Es público y sin sesión (un error de UI puede pasar sin haber entrado), así
 * que sin límite cualquiera puede inundar el webhook de avisos del profesional
 * hasta que los errores reales se pierdan entre el ruido.
 */
export const limitadorMonitoreo = new LimitadorTasa(20, 60 * 1000);

/**
 * Llamadas a la IA por paciente: 30 por hora.
 *
 * Cada llamada se factura contra la `ANTHROPIC_API_KEY` del profesional. Sin
 * tope, un solo paciente en bucle le genera una factura sin techo. 30 por hora
 * es muy por encima de una conversación normal con el asistente.
 */
export const limitadorIaPaciente = new LimitadorTasa(30, 60 * 60 * 1000);

/**
 * Llamadas a la IA por consultorio: 300 por hora.
 *
 * Segundo techo, agregado: el límite por paciente no sirve si el abuso viene
 * repartido entre muchas cuentas de pacientes del mismo consultorio.
 */
export const limitadorIaInquilino = new LimitadorTasa(300, 60 * 60 * 1000);
