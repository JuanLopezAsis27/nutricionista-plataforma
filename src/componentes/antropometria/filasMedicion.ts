import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
} from "@/dominio/servicios/grasaPorPliegues";

/**
 * La planilla antropométrica como datos: qué filas tiene y de dónde sale el
 * valor de cada una.
 *
 * Vive aparte de la pantalla porque es la ÚNICA definición de la planilla y la
 * leen dos vistas con formas distintas —la tarjeta resumida de cada medición y
 * su ficha completa—. Mientras estuvo adentro del componente de la tabla, el
 * orden y las etiquetas eran un detalle de ESA tabla; si la ficha las hubiera
 * repetido, agregar una medida al formulario habría dejado a una de las dos
 * vistas sin mostrarla, en silencio.
 */

export interface Fila {
  etiqueta: string;
  valor: (m: MedicionComposicionDto) => number | null;
  /** Derivada = la calcula el dominio, no se carga a mano. */
  derivada?: boolean;
}

export interface Grupo {
  titulo: string;
  filas: Fila[];
}

/**
 * La planilla completa, en el orden en que se toma y se lee: básicos,
 * diámetros, perímetros, pliegues y lo que el dominio deriva de todo eso.
 *
 * Son los números crudos, y por eso existe además de los gráficos: la paleta
 * en tema claro exige que el dato esté disponible sin depender del color.
 */
export const GRUPOS: Grupo[] = [
  {
    titulo: "Básicos",
    filas: [
      { etiqueta: "Peso (kg)", valor: (m) => m.medidas.pesoKg },
      {
        etiqueta: "Kg bajados",
        valor: (m) => m.medidas.kgBajadosVsAnterior,
        derivada: true,
      },
      {
        etiqueta: "Kg bajados acum.",
        valor: (m) => m.medidas.kgBajadosAcumulados,
        derivada: true,
      },
      { etiqueta: "Talla (cm)", valor: (m) => m.medidas.tallaCm },
      {
        etiqueta: "Talla sentado (cm)",
        valor: (m) => m.medidas.tallaSentadoCm,
      },
    ],
  },
  {
    titulo: "Diámetros óseos (cm)",
    filas: [
      { etiqueta: "Biacromial", valor: (m) => m.medidas.diamBiacromial },
      {
        etiqueta: "Tórax transverso",
        valor: (m) => m.medidas.diamToraxTransverso,
      },
      {
        etiqueta: "Tórax anteroposterior",
        valor: (m) => m.medidas.diamToraxAnteroposterior,
      },
      {
        etiqueta: "Bi-iliocrestídeo",
        valor: (m) => m.medidas.diamBiiliocrestideo,
      },
      { etiqueta: "Humeral", valor: (m) => m.medidas.diamHumeral },
      { etiqueta: "Femoral", valor: (m) => m.medidas.diamFemoral },
    ],
  },
  {
    titulo: "Perímetros (cm)",
    filas: [
      { etiqueta: "Cabeza", valor: (m) => m.medidas.circCabeza },
      { etiqueta: "Brazo relajado", valor: (m) => m.medidas.circBrazo },
      {
        etiqueta: "Brazo flexionado",
        valor: (m) => m.medidas.circBrazoContraido,
      },
      { etiqueta: "Antebrazo", valor: (m) => m.medidas.circAntebrazo },
      { etiqueta: "Tórax mesoesternal", valor: (m) => m.medidas.circTorax },
      { etiqueta: "Cintura mínima", valor: (m) => m.medidas.circCinturaMinima },
      { etiqueta: "Cintura máxima", valor: (m) => m.medidas.circCinturaMaxima },
      { etiqueta: "Cadera", valor: (m) => m.medidas.circCadera },
      { etiqueta: "Muslo máximo", valor: (m) => m.medidas.circMusloMaximo },
      { etiqueta: "Muslo medial", valor: (m) => m.medidas.circMusloMedial },
      { etiqueta: "Pantorrilla", valor: (m) => m.medidas.circPantorrilla },
    ],
  },
  {
    titulo: "Pliegues cutáneos (mm)",
    filas: [
      { etiqueta: "Tricipital", valor: (m) => m.medidas.pliegueTricipital },
      { etiqueta: "Subescapular", valor: (m) => m.medidas.pliegueSubescapular },
      { etiqueta: "Supraespinal", valor: (m) => m.medidas.pliegueSupraespinal },
      { etiqueta: "Abdominal", valor: (m) => m.medidas.pliegueAbdominal },
      { etiqueta: "Muslo", valor: (m) => m.medidas.pliegueMuslo },
      { etiqueta: "Pantorrilla", valor: (m) => m.medidas.plieguePantorrilla },
      { etiqueta: "Bicipital", valor: (m) => m.medidas.pliegueBicipital },
      {
        etiqueta: "Cresta ilíaca",
        valor: (m) => m.medidas.pliegueCrestaIliaca,
      },
      { etiqueta: "Pectoral", valor: (m) => m.medidas.plieguePectoral },
      { etiqueta: "Axilar medio", valor: (m) => m.medidas.pliegueAxilarMedio },
      { etiqueta: "Lumbar", valor: (m) => m.medidas.pliegueLumbar },
      {
        etiqueta: "Σ 6 pliegues",
        valor: (m) => m.resultado.indices.sumatoria6Pliegues,
        derivada: true,
      },
      {
        etiqueta: "Σ 8 pliegues (ISAK)",
        valor: (m) => m.resultado.indices.sumatoria8Pliegues,
        derivada: true,
      },
    ],
  },
  {
    titulo: "Resultados calculados",
    filas: [
      {
        etiqueta: "Masa adiposa (kg)",
        valor: (m) => m.resultado.fraccionamiento?.adiposa.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa muscular (kg)",
        valor: (m) => m.resultado.fraccionamiento?.muscular.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa residual (kg)",
        valor: (m) => m.resultado.fraccionamiento?.residual.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa ósea (kg)",
        valor: (m) => m.resultado.fraccionamiento?.osea.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa de la piel (kg)",
        valor: (m) => m.resultado.fraccionamiento?.piel.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "IMC",
        valor: (m) => m.resultado.indices.imc,
        derivada: true,
      },
      {
        etiqueta: "Índice cintura/cadera",
        valor: (m) => m.resultado.indices.indiceCinturaCadera,
        derivada: true,
      },
      {
        etiqueta: "Endomorfia",
        valor: (m) => m.resultado.somatotipo?.endomorfia ?? null,
        derivada: true,
      },
      {
        etiqueta: "Mesomorfia",
        valor: (m) => m.resultado.somatotipo?.mesomorfia ?? null,
        derivada: true,
      },
      {
        etiqueta: "Ectomorfia",
        valor: (m) => m.resultado.somatotipo?.ectomorfia ?? null,
        derivada: true,
      },
      {
        etiqueta: "Metabolismo basal (kcal)",
        valor: (m) => m.resultado.energia?.metabolismoBasalKcal ?? null,
        derivada: true,
      },
      {
        etiqueta: "Gasto energético total (kcal)",
        valor: (m) => m.resultado.energia?.gastoEnergeticoTotalKcal ?? null,
        derivada: true,
      },
      { etiqueta: "Kg grasa (manual)", valor: (m) => m.medidas.kgGrasa },
    ],
  },
  {
    titulo: "Grasa por pliegues (2 componentes)",
    // Una fila por ecuación: los valores de métodos distintos NO se comparan
    // entre sí, se leen en paralelo sobre las mismas medidas.
    filas: METODOS_GRASA.map((metodo) => ({
      etiqueta: `${DEFINICIONES_METODO[metodo].etiqueta} (%)`,
      valor: (m: MedicionComposicionDto) =>
        m.resultado.grasaPorPliegues.resultados.find((r) => r.metodo === metodo)
          ?.porcentajeGrasa ?? null,
      derivada: true,
    })),
  },
];
