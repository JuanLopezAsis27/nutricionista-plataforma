import type { CampoPlantilla } from "./PlantillaAntropometrica";

/**
 * Plantillas de fábrica: el punto de partida para armar las propias.
 *
 * No se persisten ni se editan. El profesional elige una, destilda lo que no
 * usa y guarda el resultado como plantilla propia — que es exactamente el
 * flujo pedido: partir de las originales y sacar lo que sobra.
 */
export interface PlantillaBase {
  clave: string;
  nombre: string;
  descripcion: string;
  campos: CampoPlantilla[];
}

/** Los 6 pliegues de la planilla del profesional. */
const SEIS_PLIEGUES: CampoPlantilla[] = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
];

export const PLANTILLAS_BASE: PlantillaBase[] = [
  {
    clave: "SEIS_PLIEGUES",
    nombre: "6 pliegues (consulta habitual)",
    descripcion:
      "Talla y los 6 pliegues. Resuelve Yuhasz/Carter y Faulkner con sus " +
      "variantes de Kerr. Es la carga más rápida y la que se usa a diario.",
    campos: ["tallaCm", ...SEIS_PLIEGUES],
  },
  {
    clave: "CUATRO_PLIEGUES",
    nombre: "4 pliegues (mínima)",
    descripcion:
      "Lo mínimo que arroja un resultado: los 4 pliegues de Faulkner. " +
      "No alcanza para Yuhasz/Carter, que necesita muslo y pantorrilla.",
    campos: [
      "tallaCm",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
    ],
  },
  {
    clave: "SEIS_MAS_CINTURA",
    nombre: "6 pliegues + cintura y cadera",
    descripcion:
      "Los 6 pliegues más los perímetros de cintura y cadera, para seguir " +
      "también el índice cintura/cadera y su riesgo asociado.",
    campos: ["tallaCm", ...SEIS_PLIEGUES, "circCinturaMinima", "circCadera"],
  },
  {
    clave: "OCHO_PLIEGUES",
    nombre: "8 pliegues (todas las ecuaciones)",
    descripcion:
      "Suma bicipital y cresta ilíaca a los 6 habituales: con eso entran " +
      "también Withers (atletas) y Durnin & Womersley (población general).",
    campos: [
      "tallaCm",
      ...SEIS_PLIEGUES,
      "pliegueBicipital",
      "pliegueCrestaIliaca",
    ],
  },
  {
    clave: "JACKSON_POLLOCK_PARRILLO",
    nombre: "Jackson & Pollock + Parrillo (11 pliegues)",
    descripcion:
      "Los 8 del perfil ISAK más pectoral, axilar medio y lumbar, que son " +
      "los sitios que el ISAK no tiene. Habilita todas las ecuaciones de " +
      "2 componentes, incluidas Jackson & Pollock y Parrillo.",
    campos: [
      "tallaCm",
      ...SEIS_PLIEGUES,
      "pliegueBicipital",
      "pliegueCrestaIliaca",
      "plieguePectoral",
      "pliegueAxilarMedio",
      "pliegueLumbar",
    ],
  },
  {
    clave: "ISAK_COMPLETO",
    nombre: "Perfil ISAK completo",
    descripcion:
      "Las 25 medidas del protocolo: única que habilita el fraccionamiento " +
      "en 5 masas de Kerr, el somatotipo y el perfil Phantom entero.",
    campos: [
      "tallaCm",
      "tallaSentadoCm",
      "diamBiacromial",
      "diamToraxTransverso",
      "diamToraxAnteroposterior",
      "diamBiiliocrestideo",
      "diamHumeral",
      "diamFemoral",
      "circCabeza",
      "circBrazo",
      "circBrazoContraido",
      "circAntebrazo",
      "circTorax",
      "circCinturaMinima",
      "circCinturaMaxima",
      "circCadera",
      "circMusloMaximo",
      "circMusloMedial",
      "circPantorrilla",
      ...SEIS_PLIEGUES,
      "pliegueBicipital",
      "pliegueCrestaIliaca",
    ],
  },
];
