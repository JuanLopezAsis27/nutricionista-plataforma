import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { CrearPlan, type DatosCrearPlan } from "./CrearPlan";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";

/** Cuántos sufijos se prueban antes de rendirse: «Julia Pérez (2)»…«(50)». */
const MAX_INTENTOS_DE_NOMBRE = 50;

/** Entrada: el plan completo (como en `CrearPlan`) + a quién y desde cuándo. */
export interface DatosCrearPlanParaPaciente extends Omit<
  DatosCrearPlan,
  "esPlantilla" | "grupoId"
> {
  pacienteId: string;
  fechaInicio: Date;
  fechaFin?: Date | null;
}

/**
 * Caso de uso: crear un plan NUEVO directamente para un paciente, desde su
 * ficha —ya sea armado en la app o subiendo el PDF/Word—, y dejarlo asignado.
 *
 * No es "crear plan" + "mover a carpeta" + "asignar" hecho a mano en la
 * pantalla: el profesional entra a esto UNA vez, y partirlo en pasos sueltos
 * dejaría huecos si alguno fallara a mitad de camino (un plan sin asignar, o
 * asignado pero suelto de la carpeta del paciente).
 *
 * Todos los planes que se le creen a ESE paciente por acá cae en la MISMA
 * carpeta —la que lleva su nombre—: la primera vez se crea, las siguientes se
 * reutiliza (`GrupoPlan.pacienteId`, migración 56). Reencontrarla por nombre de
 * texto sería frágil (dos pacientes homónimos, un cambio de apellido); por eso
 * la carpeta queda atada al paciente y no a su nombre.
 */
export class CrearPlanParaPaciente {
  constructor(
    private readonly crearPlanUC: CrearPlan,
    private readonly asignarUC: AsignarPlanAPaciente,
    private readonly grupos: IGrupoPlanRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosCrearPlanParaPaciente): Promise<PlanNutricional> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const carpeta = await this.obtenerOCrearCarpeta(
      datos.pacienteId,
      paciente.nombreCompleto,
    );

    const plan = await this.crearPlanUC.ejecutar({
      ...datos,
      esPlantilla: false,
      grupoId: carpeta.id,
    });

    // Reemplaza cualquier plan activo previo, como cualquier otra asignación:
    // un paciente solo sigue un plan a la vez.
    await this.asignarUC.ejecutar({
      planId: plan.id,
      pacienteId: datos.pacienteId,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin ?? null,
    });

    return plan;
  }

  /** La carpeta que ya tiene el paciente, o una nueva con su nombre. */
  private async obtenerOCrearCarpeta(
    pacienteId: string,
    nombreCompleto: string,
  ): Promise<GrupoPlan> {
    const existente = await this.grupos.obtenerPorPaciente(pacienteId);
    if (existente) return existente;

    // El nombre del paciente puede chocar con una carpeta que alguien ya
    // armó a mano (u homónimos): se numera, como el nombre de un plan
    // clonado, en vez de fallar en un flujo que no tiene dónde escribir uno
    // distinto.
    for (let intento = 1; intento <= MAX_INTENTOS_DE_NOMBRE; intento += 1) {
      const nombre =
        intento === 1 ? nombreCompleto : `${nombreCompleto} (${intento})`;
      if (!(await this.grupos.existeNombre(nombre))) {
        return this.grupos.crear(
          GrupoPlan.crear({ nombre, pacienteId }, crypto.randomUUID()),
        );
      }
    }
    // Virtualmente inalcanzable, pero deja el tipo de retorno sin `| null`.
    return this.grupos.crear(
      GrupoPlan.crear(
        { nombre: nombreCompleto, pacienteId },
        crypto.randomUUID(),
      ),
    );
  }
}
