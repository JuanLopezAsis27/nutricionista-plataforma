import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IObjetivoComposicionRepositorio } from "@/dominio/repositorios/IObjetivoComposicionRepositorio";
import type { IPlantillaAntropometricaRepositorio } from "@/dominio/repositorios/IPlantillaAntropometricaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IInterpretadorHistoriaClinica } from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import { GuardarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarHistoriaClinica";
import { ObtenerHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerHistoriaClinica";
import { InterpretarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/InterpretarHistoriaClinica";
import { RegistrarAntropometria } from "@/aplicacion/casos-de-uso/evaluacion/RegistrarAntropometria";
import { ActualizarAntropometria } from "@/aplicacion/casos-de-uso/evaluacion/ActualizarAntropometria";
import { EliminarAntropometria } from "@/aplicacion/casos-de-uso/evaluacion/EliminarAntropometria";
import { ObtenerEvolucionAntropometrica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerEvolucionAntropometrica";
import { ObtenerComposicionCorporal } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerComposicionCorporal";
import { GuardarObjetivoComposicion } from "@/aplicacion/casos-de-uso/evaluacion/GuardarObjetivoComposicion";
import { EliminarObjetivoComposicion } from "@/aplicacion/casos-de-uso/evaluacion/EliminarObjetivoComposicion";
import { GuardarPlantillaAntropometrica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarPlantillaAntropometrica";
import { EliminarPlantillaAntropometrica } from "@/aplicacion/casos-de-uso/evaluacion/EliminarPlantillaAntropometrica";
import { ObtenerPlantillasAntropometricas } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerPlantillasAntropometricas";
import { RegistrarAlertaAlimentaria } from "@/aplicacion/casos-de-uso/evaluacion/RegistrarAlertaAlimentaria";
import { ActualizarAlertaAlimentaria } from "@/aplicacion/casos-de-uso/evaluacion/ActualizarAlertaAlimentaria";
import { EliminarAlertaAlimentaria } from "@/aplicacion/casos-de-uso/evaluacion/EliminarAlertaAlimentaria";
import { ObtenerAlertasAlimentarias } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerAlertasAlimentarias";
import { RegistrarLaboratorio } from "@/aplicacion/casos-de-uso/evaluacion/RegistrarLaboratorio";
import { ActualizarLaboratorio } from "@/aplicacion/casos-de-uso/evaluacion/ActualizarLaboratorio";
import { EliminarLaboratorio } from "@/aplicacion/casos-de-uso/evaluacion/EliminarLaboratorio";
import { ObtenerLaboratorios } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerLaboratorios";
import { ServicioEvaluacion } from "@/aplicacion/servicios/ServicioEvaluacion";
import { ServicioHistoriaClinica } from "@/aplicacion/servicios/evaluacion/ServicioHistoriaClinica";
import { ServicioAntropometria } from "@/aplicacion/servicios/evaluacion/ServicioAntropometria";
import { ServicioAlertasAlimentarias } from "@/aplicacion/servicios/evaluacion/ServicioAlertasAlimentarias";
import { ServicioLaboratorios } from "@/aplicacion/servicios/evaluacion/ServicioLaboratorios";

/** Arma el servicio de Evaluación Integral con sus casos de uso. */
export function crearServicioEvaluacion(deps: {
  historias: IHistoriaClinicaRepositorio;
  antropometrias: IAntropometriaRepositorio;
  objetivosComposicion: IObjetivoComposicionRepositorio;
  plantillasAntropometricas: IPlantillaAntropometricaRepositorio;
  alertas: IAlertaAlimentariaRepositorio;
  laboratorios: ILaboratorioRepositorio;
  archivos: IArchivoRepositorio;
  pacientes: IPacienteRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
  interpretadorHistoriaClinica: IInterpretadorHistoriaClinica;
}): ServicioEvaluacion {
  // Cada servicio recibe SOLO los casos de uso de su subdominio. Antes esto
  // era una sola lista de 20 argumentos posicionales, donde invertir dos del
  // mismo tipo compilaba sin chistar.
  return new ServicioEvaluacion(
    new ServicioHistoriaClinica(
      new GuardarHistoriaClinica(deps.historias, deps.pacientes),
      new ObtenerHistoriaClinica(deps.historias, deps.pacientes),
      new InterpretarHistoriaClinica(
        deps.interpretadorHistoriaClinica,
        deps.archivos,
        deps.pacientes,
      ),
    ),
    new ServicioAntropometria(
      new RegistrarAntropometria(deps.antropometrias, deps.pacientes),
      new ActualizarAntropometria(deps.antropometrias),
      new EliminarAntropometria(deps.antropometrias),
      new ObtenerEvolucionAntropometrica(deps.antropometrias, deps.pacientes),
      new ObtenerComposicionCorporal(
        deps.antropometrias,
        deps.objetivosComposicion,
        deps.pacientes,
      ),
      new GuardarObjetivoComposicion(deps.objetivosComposicion, deps.pacientes),
      new EliminarObjetivoComposicion(deps.objetivosComposicion),
      new GuardarPlantillaAntropometrica(deps.plantillasAntropometricas),
      new EliminarPlantillaAntropometrica(deps.plantillasAntropometricas),
      new ObtenerPlantillasAntropometricas(deps.plantillasAntropometricas),
    ),
    new ServicioAlertasAlimentarias(
      new RegistrarAlertaAlimentaria(deps.alertas, deps.pacientes),
      new ActualizarAlertaAlimentaria(deps.alertas),
      new EliminarAlertaAlimentaria(deps.alertas),
      new ObtenerAlertasAlimentarias(deps.alertas, deps.pacientes),
    ),
    new ServicioLaboratorios(
      new RegistrarLaboratorio(deps.laboratorios, deps.pacientes),
      new ActualizarLaboratorio(deps.laboratorios),
      new EliminarLaboratorio(
        deps.laboratorios,
        deps.archivos,
        deps.almacenamiento,
      ),
      new ObtenerLaboratorios(deps.laboratorios, deps.pacientes),
    ),
  );
}
