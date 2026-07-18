/**
 * Puerto de cola de trabajos en segundo plano. Permite a los casos de uso
 * diferir trabajo (enviar un email, generar un informe) sin conocer la
 * implementación (pg-boss) ni el proceso worker que lo ejecuta.
 */
export interface IColaTrabajos {
  encolar<T extends object>(
    nombre: string,
    datos: T,
    opciones?: { ejecutarEn?: Date },
  ): Promise<void>;
}
