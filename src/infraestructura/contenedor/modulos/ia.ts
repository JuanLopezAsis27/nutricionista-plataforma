import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { IAsistenteNutricional } from "@/dominio/servicios/IAsistenteNutricional";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";
import type { IAnalisisPredictivo } from "@/dominio/servicios/IAnalisisPredictivo";
import { PreguntarAlAsistente } from "@/dominio/casos-de-uso/ia/PreguntarAlAsistente";
import { AnalizarFotoDeComida } from "@/dominio/casos-de-uso/ia/AnalizarFotoDeComida";
import { ListarConsultasIA } from "@/dominio/casos-de-uso/ia/ListarConsultasIA";
import { ObtenerInsightsPredictivos } from "@/dominio/casos-de-uso/ia/ObtenerInsightsPredictivos";
import { ServicioIA } from "@/aplicacion/servicios/ServicioIA";

/** Arma el servicio de IA (andamiaje con adaptadores stub, futuro Claude). */
export function crearServicioIA(deps: {
  pacientes: IPacienteRepositorio;
  objetivos: IObjetivoRepositorio;
  planes: IPlanRepositorio;
  historial: IHistorialIARepositorio;
  asistente: IAsistenteNutricional;
  analisisComida: IAnalisisComidaIA;
  analisisPredictivo: IAnalisisPredictivo;
}): ServicioIA {
  return new ServicioIA(
    new PreguntarAlAsistente(
      deps.pacientes,
      deps.objetivos,
      deps.planes,
      deps.asistente,
      deps.historial,
    ),
    new AnalizarFotoDeComida(deps.analisisComida, deps.historial),
    new ListarConsultasIA(deps.historial),
    new ObtenerInsightsPredictivos(deps.analisisPredictivo),
  );
}
