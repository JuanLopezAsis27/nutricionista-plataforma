import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { IAsistenteNutricional } from "@/dominio/servicios/IAsistenteNutricional";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";
import type { IAnalisisPredictivo } from "@/dominio/servicios/IAnalisisPredictivo";
import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IRetroalimentacionInsightRepositorio } from "@/dominio/repositorios/IRetroalimentacionInsightRepositorio";
import { PreguntarAlAsistente } from "@/dominio/casos-de-uso/ia/PreguntarAlAsistente";
import { AnalizarFotoDeComida } from "@/dominio/casos-de-uso/ia/AnalizarFotoDeComida";
import { ListarConsultasIA } from "@/dominio/casos-de-uso/ia/ListarConsultasIA";
import { ObtenerInsightsPredictivos } from "@/dominio/casos-de-uso/ia/ObtenerInsightsPredictivos";
import { AnalizarConAsistente } from "@/dominio/casos-de-uso/ia/AnalizarConAsistente";
import { RegistrarRetroalimentacionInsight } from "@/dominio/casos-de-uso/ia/RegistrarRetroalimentacionInsight";
import { ServicioIA, type EstadoIADeps } from "@/aplicacion/servicios/ServicioIA";

/** Arma el servicio de IA (adaptadores Claude/ML con degradación a stub). */
export function crearServicioIA(deps: {
  pacientes: IPacienteRepositorio;
  objetivos: IObjetivoRepositorio;
  planes: IPlanRepositorio;
  recetas: IRecetaRepositorio;
  turnos: ITurnoRepositorio;
  alertas: IAlertaAlimentariaRepositorio;
  axiomas: IAxiomaRepositorio;
  historial: IHistorialIARepositorio;
  asistente: IAsistenteNutricional;
  asistenteAnalitico: IAsistenteAnalitico;
  analisisComida: IAnalisisComidaIA;
  analisisPredictivo: IAnalisisPredictivo;
  retroalimentacion: IRetroalimentacionInsightRepositorio;
  estado: EstadoIADeps;
}): ServicioIA {
  return new ServicioIA(
    new PreguntarAlAsistente(
      deps.pacientes,
      deps.objetivos,
      deps.planes,
      deps.recetas,
      deps.alertas,
      deps.axiomas,
      deps.asistente,
      deps.historial,
    ),
    new AnalizarFotoDeComida(deps.analisisComida, deps.historial),
    new ListarConsultasIA(deps.historial),
    new ObtenerInsightsPredictivos(deps.analisisPredictivo),
    new AnalizarConAsistente(
      deps.pacientes,
      deps.planes,
      deps.recetas,
      deps.turnos,
      deps.objetivos,
      deps.alertas,
      deps.asistenteAnalitico,
    ),
    new RegistrarRetroalimentacionInsight(deps.retroalimentacion, deps.pacientes),
    deps.estado,
  );
}
