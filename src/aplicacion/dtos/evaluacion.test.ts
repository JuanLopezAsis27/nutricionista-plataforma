import { describe, it, expect } from "vitest";
import {
  importarMedicionesDto,
  registrarAntropometriaDto,
} from "./evaluacion.dto";

/**
 * Dónde se aplica el rango de una medida, que no es lo mismo según entre de a
 * una o en un lote. Ver `FormaDeAcotar` en el DTO.
 */
describe("rangos de las medidas antropométricas", () => {
  const medida = { pacienteId: "pac-1", fecha: "2026-03-10", pesoKg: 64 };

  it("la carga de UNA medición rechaza el valor fuera de rango en el esquema", () => {
    const resultado = registrarAntropometriaDto.safeParse({
      ...medida,
      circPantorrilla: 2,
    });

    expect(resultado.success).toBe(false);
  });

  it("el LOTE acepta el valor fuera de rango: lo resuelve fila por fila", () => {
    // Esto es el bug que se veía al importar una planilla: un perímetro mal
    // leído por la IA hacía que Zod rechazara el input entero y las once
    // mediciones se perdían. El rango lo aplica `Antropometria.crear`, que
    // rechaza ESA fila y deja entrar las demás.
    const resultado = importarMedicionesDto.safeParse({
      pacienteId: "pac-1",
      mediciones: [
        { fecha: "2026-03-10", pesoKg: 64, circPantorrilla: 2 },
        { fecha: "2026-04-10", pesoKg: 65 },
      ],
    });

    expect(resultado.success).toBe(true);
  });

  it("el LOTE sigue exigiendo que la medición tenga peso y fecha", () => {
    const sinPeso = importarMedicionesDto.safeParse({
      pacienteId: "pac-1",
      mediciones: [{ fecha: "2026-03-10" }],
    });
    const sinFecha = importarMedicionesDto.safeParse({
      pacienteId: "pac-1",
      mediciones: [{ pesoKg: 64 }],
    });

    expect(sinPeso.success).toBe(false);
    expect(sinFecha.success).toBe(false);
  });
});
