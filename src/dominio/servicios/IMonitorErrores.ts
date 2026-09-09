/** Contexto opcional que acompaña a un error capturado. */
export interface ContextoError {
  /** De dónde vino: "servidor", "trpc", "cliente", "worker", … */
  origen?: string;
  /** Ruta o procedimiento donde ocurrió. */
  ruta?: string;
  /** Usuario afectado (si se conoce), sin datos sensibles. */
  usuarioId?: string;
  /** Datos extra no sensibles para depurar. */
  extra?: Record<string, unknown>;
}

/**
 * Puerto de monitoreo de errores.
 *
 * Abstrae el destino de los errores no esperados (los de negocio se manejan con
 * ErrorDominio). La implementación por defecto los registra de forma
 * estructurada; se puede enchufar un webhook o un proveedor (Sentry) detrás de
 * esta misma interfaz sin tocar el resto de la app.
 *
 * `capturar` es best-effort y NUNCA debe lanzar: el monitoreo no puede tumbar
 * el flujo que lo invoca.
 */
export interface IMonitorErrores {
  capturar(error: unknown, contexto?: ContextoError): void;
}
