import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";

/**
 * Sincronizador no-op: se usa cuando la integración con Google no está
 * configurada. La app funciona igual que siempre (sin calendario externo).
 */
export class SincronizadorNulo implements ISincronizadorCalendario {
  async alAgendar(): Promise<void> {}
  async alReprogramar(): Promise<void> {}
  async alCancelar(): Promise<void> {}
}
