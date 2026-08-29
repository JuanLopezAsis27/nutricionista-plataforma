import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { PlanNutricional } from "../../entidades/PlanNutricional";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorPlanDuplicado } from "../../errores/ErrorPlanDuplicado";

/** Entrada: plantilla (o plan) de origen y ajustes del clon. */
export interface DatosCrearDesdePlantilla {
  planOrigenId: string;
  nombre?: string | null;
  /** true = duplicar como plantilla; false (default) = plan para asignar. */
  esPlantilla?: boolean;
}

/** Cuántos sufijos se prueban antes de rendirse: «Descenso (2)»…«Descenso (50)». */
const MAX_INTENTOS_DE_NOMBRE = 50;

/**
 * Caso de uso: crear un plan como clon profundo de otro (plantilla → plan
 * personalizado, o duplicado de plantilla). El clon guarda planOrigenId.
 *
 * El nombre se NUMERA solo si hace falta. Clonar es un clic sin formulario —no
 * hay dónde escribir un nombre distinto— y desde que el nombre es único,
 * fallar con "ya existe un plan llamado X" dejaría el botón inservible a partir
 * del segundo uso de la misma plantilla. Un nombre que el profesional escribió
 * a mano, en cambio, no se toca: si choca, se lo decimos.
 */
export class CrearPlanDesdePlantilla {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: DatosCrearDesdePlantilla): Promise<PlanNutricional> {
    const origen = await this.planes.obtenerPorId(datos.planOrigenId);
    if (!origen) {
      throw new ErrorPlanNoEncontrado(datos.planOrigenId);
    }
    const esPlantilla = datos.esPlantilla ?? false;
    const pedido = datos.nombre?.trim();

    const nombre = pedido
      ? await this.verificarLibre(pedido, esPlantilla)
      : await this.primeroLibre(origen.nombre, esPlantilla);

    const clon = origen.clonar(crypto.randomUUID(), () => crypto.randomUUID(), {
      nombre,
      esPlantilla,
    });
    // Sin archivos: cada uno pertenece a UN plan y copiarlos del bucket sería
    // otra función (ver PlanNutricional.clonar).
    return this.planes.crear(clon, []);
  }

  /** El nombre que pidió el profesional, o el error si ya está tomado. */
  private async verificarLibre(
    nombre: string,
    esPlantilla: boolean,
  ): Promise<string> {
    if (await this.planes.existeNombre(nombre, esPlantilla)) {
      throw new ErrorPlanDuplicado(nombre, esPlantilla);
    }
    return nombre;
  }

  /** El nombre del origen, numerado hasta encontrar uno libre. */
  private async primeroLibre(
    base: string,
    esPlantilla: boolean,
  ): Promise<string> {
    for (let intento = 1; intento <= MAX_INTENTOS_DE_NOMBRE; intento += 1) {
      const candidato = intento === 1 ? base : `${base} (${intento})`;
      if (!(await this.planes.existeNombre(candidato, esPlantilla))) {
        return candidato;
      }
    }
    throw new ErrorPlanDuplicado(base, esPlantilla);
  }
}
