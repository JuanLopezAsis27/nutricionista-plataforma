import { describe, it, expect, vi } from "vitest";
import { ObtenerComposicionCorporal } from "./ObtenerComposicionCorporal";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockAntropometriaRepositorio,
  mockObjetivoComposicionRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  antropometriaEjemplo,
  objetivoComposicionEjemplo,
} from "../_ayudas-test";

/** Medición con el perfil ISAK completo, para que el fraccionamiento salga. */
function medicionCompleta(fecha: Date, pesoKg: number, id: string) {
  return antropometriaEjemplo(
    {
      fecha,
      pesoKg,
      tallaCm: 175,
      tallaSentadoCm: 92,
      diamBiacromial: 40,
      diamToraxTransverso: 29,
      diamToraxAnteroposterior: 19,
      diamBiiliocrestideo: 29,
      diamHumeral: 7,
      diamFemoral: 9.6,
      circCabeza: 56,
      circBrazo: 30,
      circBrazoContraido: 32,
      circAntebrazo: 27,
      circTorax: 95,
      circCinturaMinima: 82,
      circCadera: 98,
      circMusloMaximo: 56,
      circPantorrilla: 37,
    },
    id,
  );
}

const PACIENTE = pacienteEjemplo({
  sexo: "MASCULINO",
  fechaNacimiento: new Date("1990-01-01"),
});

describe("ObtenerComposicionCorporal", () => {
  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio(),
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });

  it("analiza cada medición y devuelve el sexo del paciente", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          medicionCompleta(new Date("2026-01-15"), 84, "ant-1"),
        ]),
      }),
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1");

    expect(composicion.sexo).toBe("MASCULINO");
    expect(composicion.mediciones).toHaveLength(1);
    expect(composicion.mediciones[0]!.resultado.fraccionamiento).not.toBeNull();
    expect(composicion.mediciones[0]!.resultado.somatotipo).not.toBeNull();
  });

  it("usa la edad a la fecha de cada medición, no la de hoy", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          medicionCompleta(new Date("2020-01-01"), 84, "ant-1"),
          medicionCompleta(new Date("2026-01-01"), 82, "ant-2"),
        ]),
      }),
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1");

    expect(composicion.mediciones[0]!.edadAnios).toBeCloseTo(30, 0);
    expect(composicion.mediciones[1]!.edadAnios).toBeCloseTo(36, 0);
  });

  it("ordena las mediciones de la más vieja a la más nueva", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          medicionCompleta(new Date("2026-06-01"), 80, "ant-2"),
          medicionCompleta(new Date("2026-01-01"), 84, "ant-1"),
        ]),
      }),
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1");

    expect(composicion.mediciones.map((m) => m.medicion.id)).toEqual([
      "ant-1",
      "ant-2",
    ]);
  });

  it("proyecta los objetivos contra la serie de su variable", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          medicionCompleta(new Date("2026-01-01"), 90, "ant-1"),
          medicionCompleta(new Date("2026-02-01"), 86, "ant-2"),
        ]),
      }),
      mockObjetivoComposicionRepositorio({
        listarPorPaciente: vi.fn(async () => [
          objetivoComposicionEjemplo({ variable: "PESO", valorObjetivo: 80 }),
        ]),
      }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1", new Date("2026-02-15"));
    const proyeccion = composicion.objetivos[0]!.proyeccion;

    expect(proyeccion.valorInicial).toBe(90);
    expect(proyeccion.valorActual).toBe(86);
    expect(proyeccion.brecha).toBe(-6);
    expect(proyeccion.ritmoSemanal).toBeLessThan(0);
    expect(proyeccion.estado).toBe("EN_CAMINO");
  });

  it("deja fuera de la serie las mediciones que no dan esa variable", async () => {
    // La primera no tiene talla: sin ella no hay fraccionamiento y por lo tanto
    // tampoco masa adiposa. La proyección tiene que ignorarla, no contarla 0.
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          antropometriaEjemplo(
            { fecha: new Date("2026-01-01"), pesoKg: 90, tallaCm: null },
            "ant-1",
          ),
          medicionCompleta(new Date("2026-02-01"), 86, "ant-2"),
        ]),
      }),
      mockObjetivoComposicionRepositorio({
        listarPorPaciente: vi.fn(async () => [
          objetivoComposicionEjemplo({
            variable: "MASA_ADIPOSA_KG",
            valorObjetivo: 12,
          }),
        ]),
      }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1", new Date("2026-02-15"));
    const proyeccion = composicion.objetivos[0]!.proyeccion;

    // Un solo punto útil: hay brecha, pero todavía no hay ritmo que estimar.
    expect(proyeccion.valorInicial).toBe(proyeccion.valorActual);
    expect(proyeccion.ritmoSemanal).toBeNull();
    expect(proyeccion.estado).toBe("SIN_DATOS");
  });

  it("la serie de un objetivo de grasa usa SIEMPRE su ecuación fijada", async () => {
    // Yuhasz y Faulkner dan valores muy distintos sobre las mismas medidas:
    // la serie tiene que seguir la ecuación del objetivo, no la destacada.
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          medicionCompleta(new Date("2026-01-01"), 90, "ant-1"),
          medicionCompleta(new Date("2026-02-01"), 86, "ant-2"),
        ]),
      }),
      mockObjetivoComposicionRepositorio({
        listarPorPaciente: vi.fn(async () => [
          objetivoComposicionEjemplo({
            variable: "PORCENTAJE_GRASA",
            metodoGrasa: "FAULKNER",
            valorObjetivo: 10,
          }),
        ]),
      }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1", new Date("2026-02-15"));
    const proyeccion = composicion.objetivos[0]!.proyeccion;
    const primera = composicion.mediciones[0]!.resultado.grasaPorPliegues;

    const faulkner = primera.resultados.find((r) => r.metodo === "FAULKNER")!;
    const yuhasz = primera.resultados.find((r) => r.metodo === "YUHASZ_CARTER")!;

    expect(proyeccion.valorInicial).toBe(faulkner.porcentajeGrasa);
    expect(proyeccion.valorInicial).not.toBe(yuhasz.porcentajeGrasa);
    expect(proyeccion.ritmoSemanal).not.toBeNull();
  });

  it("un objetivo de grasa sin pliegues no arma serie", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          // Solo peso: ninguna ecuación de pliegues se puede resolver.
          antropometriaEjemplo(
            {
              fecha: new Date("2026-01-01"),
              pesoKg: 90,
              pliegueTricipital: null,
              pliegueSubescapular: null,
              pliegueSupraespinal: null,
              pliegueAbdominal: null,
              pliegueMuslo: null,
              plieguePantorrilla: null,
            },
            "ant-1",
          ),
        ]),
      }),
      mockObjetivoComposicionRepositorio({
        listarPorPaciente: vi.fn(async () => [
          objetivoComposicionEjemplo({
            variable: "PORCENTAJE_GRASA",
            metodoGrasa: "YUHASZ_CARTER",
            valorObjetivo: 10,
          }),
        ]),
      }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => PACIENTE) }),
    );

    const composicion = await casoUso.ejecutar("pac-1");
    expect(composicion.objetivos[0]!.proyeccion.estado).toBe("SIN_DATOS");
    expect(composicion.objetivos[0]!.proyeccion.valorActual).toBeNull();
  });

  it("sin sexo cargado devuelve las mediciones sin fraccionamiento", async () => {
    const casoUso = new ObtenerComposicionCorporal(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => [
          medicionCompleta(new Date("2026-01-15"), 84, "ant-1"),
        ]),
      }),
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo({ sexo: null })),
      }),
    );

    const composicion = await casoUso.ejecutar("pac-1");
    const resultado = composicion.mediciones[0]!.resultado;

    expect(composicion.sexo).toBeNull();
    expect(resultado.fraccionamiento).toBeNull();
    // El somatotipo no depende del sexo: se sigue calculando.
    expect(resultado.somatotipo).not.toBeNull();
    expect(
      resultado.faltantes.find((f) => f.bloque === "FRACCIONAMIENTO")!.campos,
    ).toContain("Sexo biológico del paciente");
  });
});
