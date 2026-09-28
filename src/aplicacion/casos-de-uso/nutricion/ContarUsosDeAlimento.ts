import type {
  IUsosDeAlimentoRepositorio,
  UsosDeAlimento,
} from "@/dominio/repositorios/IUsosDeAlimentoRepositorio";

/**
 * Caso de uso: dónde se usa un alimento, para avisarlo antes de editarlo o
 * borrarlo (migración 85).
 *
 * Es solo información: ni editar ni borrar el alimento cambia los planes y
 * recetas que lo usan, porque sus macros están copiados ahí. El aviso existe
 * para que el profesional sepa que esos planes siguen con los valores
 * anteriores. Solo cuenta lo cargado desde la migración 85 (las copias
 * anteriores no guardaron de qué alimento salieron).
 */
export class ContarUsosDeAlimento {
  constructor(private readonly usos: IUsosDeAlimentoRepositorio) {}

  ejecutar(alimentoId: string): Promise<UsosDeAlimento> {
    return this.usos.contar(alimentoId);
  }
}
