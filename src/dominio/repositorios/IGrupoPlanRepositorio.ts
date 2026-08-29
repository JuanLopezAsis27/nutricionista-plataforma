import type { GrupoPlan } from "../entidades/GrupoPlan";

/**
 * Una carpeta con lo que tiene adentro, contado POR TIPO.
 *
 * Separado porque la pantalla navega planes y plantillas por separado: una
 * carpeta con 3 planes y ninguna plantilla tiene que mostrarse vacía en la
 * pestaña de plantillas, no decir "3" y abrirse sin nada.
 */
export interface GrupoPlanConTotal {
  grupo: GrupoPlan;
  /** Planes (no plantillas) en la carpeta, archivados incluidos. */
  cantidadPlanes: number;
  /** Plantillas en la carpeta, archivadas incluidas. */
  cantidadPlantillas: number;
}

/**
 * Contrato del repositorio de carpetas de planes (puerto de salida).
 *
 * `eliminar` NO se lleva los planes: la FK es SET NULL y quedan sueltos. Una
 * carpeta es cómo están ordenados, no de quién son.
 */
export interface IGrupoPlanRepositorio {
  crear(grupo: GrupoPlan): Promise<GrupoPlan>;
  actualizar(grupo: GrupoPlan): Promise<GrupoPlan>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<GrupoPlan | null>;
  listar(): Promise<GrupoPlanConTotal[]>;
  /** ¿Ya hay una carpeta con ese nombre? `excluirId` la deja renombrarse a sí misma. */
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
}
