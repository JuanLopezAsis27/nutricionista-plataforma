import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { CrearPlan, type DatosCrearPlan } from "./CrearPlan";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";
import { obtenerOCrearCarpetaDelPaciente } from "../grupos-plan/carpetaDelPaciente";

/** Entrada: el plan completo (como en `CrearPlan`) + a quién asignárselo. */
export interface DatosCrearPlanParaPaciente extends Omit<
  DatosCrearPlan,
  "esPlantilla" | "grupoId"
> {
  pacienteId: string;
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
 * reutiliza (`GrupoPlan.pacienteId`, migración 56). Ver
 * `obtenerOCrearCarpetaDelPaciente`.
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

    const carpeta = await obtenerOCrearCarpetaDelPaciente(
      this.grupos,
      datos.pacienteId,
      paciente.nombreCompleto,
    );

    const plan = await this.crearPlanUC.ejecutar({
      ...datos,
      esPlantilla: false,
      grupoId: carpeta.id,
    });

    // Se SUMA a los planes que el paciente ya tenga, como cualquier otra
    // asignación: ninguno reemplaza a otro.
    await this.asignarUC.ejecutar({
      planId: plan.id,
      pacienteId: datos.pacienteId,
    });

    return plan;
  }
}
