import { describe, it, expect } from "vitest";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { renderizarMedicionPdf } from "./MedicionAntropometricaPdf";

/**
 * Prueba de humo del PDF que se baja el paciente.
 *
 * No comprueba el texto: react-pdf convierte cada glifo en un trazo vectorial,
 * así que el documento no tiene una sola cadena de texto que se pueda leer de
 * vuelta. Lo que sí caza —y es la clase de error que este documento tiene— es
 * que una medición con un campo en null revienta el render entero y el
 * paciente ve un 500 al pedir su PDF.
 *
 * Los tres casos son los tres estados de la sección de grasa: varias
 * ecuaciones (curva + tabla de las otras), una sola (curva sin tabla) y
 * ninguna (ni curva ni tabla).
 */

function medicion(
  id: string,
  fecha: string,
  pesoKg: number,
  porcentajes: [string, number][],
  metodoGrasa: string | null,
): MedicionComposicionDto {
  return {
    id,
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    observaciones: null,
    nivelActividad: null,
    protocolo: "DOS_COMPONENTES",
    metodoGrasa,
    edadAnios: 41,
    medidas: { pesoKg, tallaCm: 178, pliegueTricipital: 12 },
    resultado: {
      indices: {
        imc: null,
        indiceCinturaCadera: null,
        sumatoria6Pliegues: null,
        sumatoria8Pliegues: null,
      },
      fraccionamiento: null,
      somatotipo: null,
      energia: null,
      grasaPorPliegues: {
        resultados: porcentajes.map(([metodo, porcentaje]) => ({
          metodo,
          etiqueta: `Ecuación ${metodo}`,
          autor: "Autor",
          poblacion: "Población",
          sumatoriaPliegues: 60,
          sitios: ["Pliegue tricipital"],
          porcentajeGrasa: porcentaje,
          masaGrasaKg: (pesoKg * porcentaje) / 100,
          masaLibreGrasaKg: pesoKg - (pesoKg * porcentaje) / 100,
          densidadCorporal: null,
        })),
        faltantes: [],
      },
      faltantes: [],
    },
  } as unknown as MedicionComposicionDto;
}

const TRES: [string, number][] = [
  ["YUHASZ_CARTER", 22.4],
  ["FAULKNER", 19.1],
  ["DURNIN_WOMERSLEY", 24.8],
];

async function renderizar(
  porcentajes: [string, number][],
  metodoGrasa: string | null,
): Promise<Buffer> {
  const primera = medicion("m1", "2024-03-01", 90, porcentajes, metodoGrasa);
  const segunda = medicion(
    "m2",
    "2024-06-10",
    86,
    porcentajes.map(([metodo, pct]) => [metodo, pct - 1.6]),
    metodoGrasa,
  );
  return renderizarMedicionPdf({
    medicion: segunda,
    anterior: primera,
    serie: [primera, segunda],
    nombrePaciente: "Ana Pérez",
    config: null,
  });
}

describe("renderizarMedicionPdf", () => {
  it("con varias ecuaciones dibuja la curva de la destacada y tabula las otras", async () => {
    const pdf = await renderizar(TRES, "FAULKNER");

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  }, 60000);

  it("sin ecuación destacada elegida usa la primera que las medidas resuelven", async () => {
    // `metodoGrasa` en null es lo normal: nadie eligió una a mano. La curva no
    // puede quedarse vacía por eso.
    const pdf = await renderizar(TRES, null);

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60000);

  it("con una sola ecuación no hay tabla de otras, y con ninguna no hay sección", async () => {
    const unaSola = await renderizar([["FAULKNER", 19.1]], "FAULKNER");
    const ninguna = await renderizar([], null);

    expect(unaSola.subarray(0, 5).toString()).toBe("%PDF-");
    expect(ninguna.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60000);
});
