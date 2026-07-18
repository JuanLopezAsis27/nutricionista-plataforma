import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

/** Implementación del reloj con la hora real del sistema. */
export class RelojSistema implements IRelojFecha {
  ahora(): Date {
    return new Date();
  }

  hoy(): Date {
    const ahora = new Date();
    return new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
    );
  }
}
