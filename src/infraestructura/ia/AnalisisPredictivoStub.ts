import type {
  IAnalisisPredictivo,
  InsightPaciente,
} from "@/dominio/servicios/IAnalisisPredictivo";

/**
 * Adaptador STUB del análisis predictivo. Devuelve insights de ejemplo que
 * describen los análisis que el módulo hará a futuro. Se reemplaza por un
 * microservicio/modelo ML que lee las tablas de eventos ya acumuladas.
 */
export class AnalisisPredictivoStub implements IAnalisisPredictivo {
  async insights(): Promise<InsightPaciente[]> {
    return [
      {
        tipo: "RIESGO_ABANDONO",
        titulo: "Predicción de abandono",
        detalle:
          "A futuro, un modelo estimará qué pacientes tienen más riesgo de dejar el tratamiento, combinando turnos, registros del diario y adherencia al plan, para anticiparse.",
        severidad: "ATENCION",
      },
      {
        tipo: "ADHERENCIA",
        titulo: "Adherencia al plan",
        detalle:
          "Se analizará qué tan seguido cada paciente registra sus comidas y respeta las franjas de su plan, para detectar quién necesita más acompañamiento.",
        severidad: "INFO",
      },
      {
        tipo: "TENDENCIA_PESO",
        titulo: "Proyección de evolución",
        detalle:
          "Con el histórico de peso (consulta + diario) se proyectará la evolución esperada y se detectarán estancamientos a tiempo.",
        severidad: "INFO",
      },
    ];
  }
}
