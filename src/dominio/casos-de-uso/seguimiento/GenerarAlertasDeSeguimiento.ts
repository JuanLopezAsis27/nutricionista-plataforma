import type { IAlertaSeguimientoRepositorio } from "../../repositorios/IAlertaSeguimientoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import {
  AlertaSeguimiento,
  type DatosNuevaAlertaSeguimiento,
} from "../../entidades/AlertaSeguimiento";

const DIAS_SIN_REGISTRO = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Resultado del barrido: cuántas alertas nuevas se generaron. */
export interface ResultadoGeneracion {
  generadas: number;
}

/**
 * Caso de uso: barrido diario de seguimiento (lo dispara el cron del worker).
 *
 * Reglas:
 *  - SIN_REGISTRO_PESO: paciente con diario iniciado que no registra peso
 *    hace 7 días.
 *  - SIN_ACTIVIDAD: ídem para actividad física.
 *  - PLAN_VENCIDO: asignación activa cuya fecha de fin ya pasó.
 *  - TURNO_SIN_CONFIRMAR: turno de MAÑANA aún PENDIENTE.
 *
 * La creación es idempotente (crearSiNoExistePendiente): correr el barrido
 * dos veces no duplica avisos.
 */
export class GenerarAlertasDeSeguimiento {
  constructor(
    private readonly alertas: IAlertaSeguimientoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly planes: IPlanRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(): Promise<ResultadoGeneracion> {
    const hoy = this.reloj.hoy();
    let generadas = 0;

    const crear = async (datos: DatosNuevaAlertaSeguimiento): Promise<void> => {
      const alerta = AlertaSeguimiento.crear(datos, crypto.randomUUID(), this.reloj.ahora());
      const creada = await this.alertas.crearSiNoExistePendiente(alerta);
      if (creada) generadas += 1;
    };

    const pacientes = await this.pacientes.listar();
    const nombreDe = new Map(pacientes.map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

    // --- Diario: sin peso / sin actividad en la última semana -------------
    const desde = new Date(hoy.getTime() - (DIAS_SIN_REGISTRO - 1) * DIA_MS);
    for (const paciente of pacientes) {
      const totalRegistros = await this.registros.contarRegistros(paciente.id);
      if (totalRegistros === 0) continue; // nunca usó el diario: no es señal

      const semana = await this.registros.listarPorRango(paciente.id, desde, hoy);
      const nombre = nombreDe.get(paciente.id) ?? paciente.id;

      const registroPeso = semana.some((r) => r.aPrimitivos().pesoKg != null);
      if (!registroPeso) {
        await crear({
          pacienteId: paciente.id,
          tipo: "SIN_REGISTRO_PESO",
          detalle: `${nombre} no registra su peso hace ${DIAS_SIN_REGISTRO} días.`,
          datos: { diasSinRegistro: DIAS_SIN_REGISTRO },
        });
      }

      const huboActividad = semana.some((r) => r.actividades.length > 0);
      if (!huboActividad) {
        await crear({
          pacienteId: paciente.id,
          tipo: "SIN_ACTIVIDAD",
          detalle: `${nombre} no registra actividad física hace ${DIAS_SIN_REGISTRO} días.`,
          datos: { diasSinRegistro: DIAS_SIN_REGISTRO },
        });
      }
    }

    // --- Planes con asignación activa vencida -----------------------------
    const vencidas = await this.planes.listarAsignacionesActivasVencidas(hoy);
    for (const asignacion of vencidas) {
      const nombre = nombreDe.get(asignacion.pacienteId) ?? asignacion.pacienteId;
      const plan = await this.planes.obtenerPorId(asignacion.planId);
      await crear({
        pacienteId: asignacion.pacienteId,
        tipo: "PLAN_VENCIDO",
        detalle: `El plan «${plan?.nombre ?? "?"}» de ${nombre} venció: toca renovarlo.`,
        referenciaId: asignacion.id,
      });
    }

    // --- Turnos de mañana sin confirmar -----------------------------------
    const manana = new Date(hoy.getTime() + DIA_MS);
    const turnosManana = await this.turnos.obtenerEnFecha(manana);
    for (const turno of turnosManana) {
      if (turno.estado !== "PENDIENTE") continue;
      const nombre = nombreDe.get(turno.pacienteId) ?? turno.pacienteId;
      await crear({
        pacienteId: turno.pacienteId,
        tipo: "TURNO_SIN_CONFIRMAR",
        detalle: `El turno de mañana ${turno.hora} con ${nombre} sigue sin confirmar.`,
        referenciaId: turno.id,
      });
    }

    return { generadas };
  }
}
