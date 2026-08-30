import type { MedidasComposicion } from "../composicionCorporal";

/**
 * Nombres legibles de cada medida.
 *
 * Es lo MENOS de dominio de todo el módulo —son rótulos de pantalla— pero se
 * queda dentro del dominio porque también los usan los mensajes de error de
 * las entidades ("falta pliegue supraespinal"), que no pueden depender de la
 * capa de presentación.
 */

/** Etiquetas legibles de cada medida, para los avisos de "falta medir". */
export const ETIQUETAS_MEDIDA: Record<keyof MedidasComposicion, string> = {
  pesoKg: "Peso",
  tallaCm: "Talla",
  tallaSentadoCm: "Talla sentado",
  diamBiacromial: "Diámetro biacromial",
  diamToraxTransverso: "Diámetro tórax transverso",
  diamToraxAnteroposterior: "Diámetro tórax anteroposterior",
  diamBiiliocrestideo: "Diámetro bi-iliocrestídeo",
  diamHumeral: "Diámetro humeral",
  diamFemoral: "Diámetro femoral",
  circCabeza: "Perímetro de cabeza",
  circBrazo: "Perímetro de brazo relajado",
  circBrazoContraido: "Perímetro de brazo flexionado",
  circAntebrazo: "Perímetro de antebrazo",
  circTorax: "Perímetro de tórax mesoesternal",
  circCinturaMinima: "Perímetro de cintura",
  circCadera: "Perímetro de cadera",
  circMusloMaximo: "Perímetro de muslo máximo",
  circMusloMedial: "Perímetro de muslo medial",
  circPantorrilla: "Perímetro de pantorrilla",
  pliegueTricipital: "Pliegue tricipital",
  pliegueSubescapular: "Pliegue subescapular",
  pliegueSupraespinal: "Pliegue supraespinal",
  pliegueAbdominal: "Pliegue abdominal",
  pliegueMuslo: "Pliegue de muslo",
  plieguePantorrilla: "Pliegue de pantorrilla",
  pliegueBicipital: "Pliegue bicipital",
  pliegueCrestaIliaca: "Pliegue de cresta ilíaca",
};
