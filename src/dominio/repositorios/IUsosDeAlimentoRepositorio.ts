/**
 * Dónde se usa un alimento (migración 85).
 *
 * Los macros de un alimento se COPIAN a donde se lo elige —la opción de un
 * plan, el ingrediente de una receta, la comida de un plan semanal—, así que
 * editarlo o borrarlo no cambia nada de lo ya cargado. Lo que sí se puede
 * saber, gracias a `alimentoOrigenId`, es cuántas de esas copias salieron de
 * él: es lo que se le avisa al que lo va a editar o borrar.
 *
 * Cuenta lo que ve el alcance en curso: en un consultorio, sus planes y
 * recetas; con alcance global (el SUPERADMIN), los de todos.
 */
export interface UsosDeAlimento {
  planes: number;
  recetas: number;
  planesSemanales: number;
  /** Recetas predeterminadas de la plataforma que lo llevan. */
  recetasPlataforma: number;
  /** En cuántos consultorios aparece (solo tiene sentido con alcance global). */
  consultorios: number;
}

export interface IUsosDeAlimentoRepositorio {
  contar(alimentoId: string): Promise<UsosDeAlimento>;
}
