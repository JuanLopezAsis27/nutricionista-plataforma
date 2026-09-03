import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { IAsistenteNutricional } from "@/dominio/servicios/IAsistenteNutricional";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";
import type { IAnalisisPredictivo } from "@/dominio/servicios/IAnalisisPredictivo";
import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { IConversacionIARepositorio } from "@/dominio/repositorios/IConversacionIARepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IRetroalimentacionInsightRepositorio } from "@/dominio/repositorios/IRetroalimentacionInsightRepositorio";
import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import { PreguntarAlAsistente } from "@/aplicacion/casos-de-uso/ia/PreguntarAlAsistente";
import { AnalizarFotoDeComida } from "@/aplicacion/casos-de-uso/ia/AnalizarFotoDeComida";
import { ObtenerInsightsPredictivos } from "@/aplicacion/casos-de-uso/ia/ObtenerInsightsPredictivos";
import { AnalizarConAsistente } from "@/aplicacion/casos-de-uso/ia/AnalizarConAsistente";
import {
  ListarConversacionesIA,
  ObtenerConversacionIA,
  EliminarConversacionIA,
} from "@/aplicacion/casos-de-uso/ia/GestionarConversacionesIA";
import { RegistrarRetroalimentacionInsight } from "@/aplicacion/casos-de-uso/ia/RegistrarRetroalimentacionInsight";
import {
  ServicioIA,
  type EstadoIADeps,
} from "@/aplicacion/servicios/ServicioIA";

/** Arma el servicio de IA (adaptadores Claude/ML con degradación a stub). */
export function crearServicioIA(deps: {
  pacientes: IPacienteRepositorio;
  objetivos: IObjetivoRepositorio;
  // La implementación de Prisma sirve los dos puertos; el cableado es el
  // único lugar que necesita saberlo.
  planes: IPlanRepositorio & IAsignacionPlanRepositorio;
  recetas: IRecetaRepositorio;
  turnos: ITurnoRepositorio;
  alertas: IAlertaAlimentariaRepositorio;
  axiomas: IAxiomaRepositorio;
  historial: IHistorialIARepositorio;
  perfilesDeportivos: IPerfilDeportivoRepositorio;
  competencias: ICompetenciaRepositorio;
  asistente: IAsistenteNutricional;
  asistenteAnalitico: IAsistenteAnalitico;
  analisisComida: IAnalisisComidaIA;
  analisisPredictivo: IAnalisisPredictivo;
  retroalimentacion: IRetroalimentacionInsightRepositorio;
  conversaciones: IConversacionIARepositorio;
  reloj: IRelojFecha;
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
      deps.conversaciones,
      deps.perfilesDeportivos,
      deps.competencias,
      deps.reloj,
    ),
    new AnalizarFotoDeComida(deps.analisisComida, deps.historial),
    new ObtenerInsightsPredictivos(deps.analisisPredictivo),
    new AnalizarConAsistente(
      deps.pacientes,
      deps.planes,
      deps.planes,
      deps.recetas,
      deps.turnos,
      deps.objetivos,
      deps.alertas,
      deps.asistenteAnalitico,
      deps.reloj,
      deps.conversaciones,
    ),
    new RegistrarRetroalimentacionInsight(
      deps.retroalimentacion,
      deps.pacientes,
    ),
    new ListarConversacionesIA(deps.conversaciones),
    new ObtenerConversacionIA(deps.conversaciones),
    new EliminarConversacionIA(deps.conversaciones),
    deps.estado,
  );
}
