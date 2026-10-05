import type {
  IEstadisticasRepositorio,
  TotalesCobro,
} from "@/dominio/repositorios/IEstadisticasRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Cobros de la semana en curso y de lo que viene después de hoy. */
export interface ResumenCobros {
  semana: TotalesCobro & {
    /** Lunes de la semana en curso (medianoche UTC). */
    desde: Date;
    /** Domingo de la semana en curso. */
    hasta: Date;
  };
  /** Turnos con fecha posterior a hoy. */
  futuro: TotalesCobro;
}

/**
 * Caso de uso: la plata de la semana y la de adelante.
 *
 * Existe porque el período de las estadísticas mira HACIA ATRÁS —termina hoy—
 * y la plata no: un paciente que pagó el turno del jueves que viene ya puso
 * esa plata, y lo que falta cobrar esta semana incluye los días que todavía
 * no llegaron. Con el período solo, un turno futuro no aparecía en ningún
 * número; ni pagado ni por cobrar.
 *
 * No depende del período elegido en pantalla, a propósito: «esta semana» y
 * «a futuro» son siempre respecto de hoy. Y hoy lo dice el reloj del
 * servidor (`IRelojFecha.hoy()`, en hora local), no el navegador.
 *
 * La semana va de lunes a domingo, la convención del resto de la app, y
 * cuenta también sus días ya pasados: lo pendiente de la semana incluye al
 * del lunes que no pagó.
 */
export class ObtenerResumenCobros {
  constructor(
    private readonly repositorio: IEstadisticasRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(): Promise<ResumenCobros> {
    const hoy = this.reloj.hoy();
    // getUTCDay(): `hoy` es medianoche UTC del día local. Lunes = 0.
    const desdeLunes = (hoy.getUTCDay() + 6) % 7;
    const lunes = new Date(hoy.getTime() - desdeLunes * DIA_MS);
    const domingo = new Date(lunes.getTime() + 6 * DIA_MS);
    const manana = new Date(hoy.getTime() + DIA_MS);

    const [semana, futuro] = await Promise.all([
      this.repositorio.cobrosEntre(lunes, domingo),
      this.repositorio.cobrosEntre(manana, null),
    ]);

    return { semana: { ...semana, desde: lunes, hasta: domingo }, futuro };
  }
}
