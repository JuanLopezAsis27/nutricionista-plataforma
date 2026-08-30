import { describe, it, expect, vi } from "vitest";
import { GuardarPlantillaAntropometrica } from "./GuardarPlantillaAntropometrica";
import { EliminarPlantillaAntropometrica } from "./EliminarPlantillaAntropometrica";
import { ObtenerPlantillasAntropometricas } from "./ObtenerPlantillasAntropometricas";
import { EliminarObjetivoComposicion } from "./EliminarObjetivoComposicion";
import { PlantillaAntropometrica } from "@/dominio/entidades/PlantillaAntropometrica";
import {
  mockPlantillaAntropometricaRepositorio,
  plantillaAntropometricaEjemplo,
  mockObjetivoComposicionRepositorio,
  objetivoComposicionEjemplo,
} from "../_ayudas-test";

/**
 * Tests de las plantillas de carga antropométrica y los objetivos de
 * composición.
 *
 * Una plantilla de carga decide QUÉ CAMPOS ve el profesional al medir. No toca
 * lo ya guardado —esa distinción es la que hace que borrarla sea seguro— pero
 * sí determina qué se puede calcular después: una plantilla sin pliegues deja
 * el fraccionamiento fuera de alcance, y la entidad valida que alcance para
 * calcular algo.
 */

describe("GuardarPlantillaAntropometrica", () => {
  it("sin id CREA una plantilla nueva", async () => {
    const repositorio = mockPlantillaAntropometricaRepositorio();
    const caso = new GuardarPlantillaAntropometrica(repositorio);

    await caso.ejecutar({
      nombre: "Solo pliegues",
      descripcion: null,
      campos: [
        "pliegueTricipital",
        "pliegueSubescapular",
        "pliegueSupraespinal",
        "pliegueAbdominal",
      ],
    });

    expect(repositorio.obtenerPorId).not.toHaveBeenCalled();
    expect(repositorio.guardar).toHaveBeenCalledTimes(1);
    const [guardada] = (repositorio.guardar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaAntropometrica];
    expect(guardada.aPrimitivos().nombre).toBe("Solo pliegues");
  });

  it("con id EDITA la existente y preserva su fecha de creación", async () => {
    // `actualizar` conserva `creadoEn`: la plantilla no nace de nuevo cada vez
    // que se le cambia el nombre.
    const existente = plantillaAntropometricaEjemplo();
    const repositorio = mockPlantillaAntropometricaRepositorio({
      obtenerPorId: vi.fn(async () => existente),
    });
    const caso = new GuardarPlantillaAntropometrica(repositorio);

    await caso.ejecutar({
      id: "plant-antro-1",
      nombre: "ISAK ampliado",
      descripcion: null,
      campos: [
        "tallaCm",
        "pliegueTricipital",
        "pliegueSubescapular",
        "pliegueSupraespinal",
        "pliegueAbdominal",
      ],
    });

    const [guardada] = (repositorio.guardar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaAntropometrica];
    expect(guardada.aPrimitivos().nombre).toBe("ISAK ampliado");
    expect(guardada.aPrimitivos().creadoEn).toEqual(
      existente.aPrimitivos().creadoEn,
    );
  });

  it("falla al editar una plantilla que no existe", async () => {
    const repositorio = mockPlantillaAntropometricaRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const caso = new GuardarPlantillaAntropometrica(repositorio);

    await expect(
      caso.ejecutar({
        id: "plant-inexistente",
        nombre: "X",
        descripcion: null,
        campos: [
          "pliegueTricipital",
          "pliegueSubescapular",
          "pliegueSupraespinal",
          "pliegueAbdominal",
        ],
      }),
    ).rejects.toThrow();
    expect(repositorio.guardar).not.toHaveBeenCalled();
  });
});

describe("EliminarPlantillaAntropometrica", () => {
  it("borra la plantilla sin tocar las mediciones ya cargadas", async () => {
    // La plantilla solo decide qué campos se MUESTRAN; lo que se guardó, se
    // guardó. Por eso borrarla no necesita ninguna comprobación de uso.
    const repositorio = mockPlantillaAntropometricaRepositorio({
      obtenerPorId: vi.fn(async () => plantillaAntropometricaEjemplo()),
    });
    const caso = new EliminarPlantillaAntropometrica(repositorio);

    await caso.ejecutar("plant-antro-1");

    expect(repositorio.eliminar).toHaveBeenCalledWith("plant-antro-1");
  });

  it("falla si no existe", async () => {
    const caso = new EliminarPlantillaAntropometrica(
      mockPlantillaAntropometricaRepositorio({
        obtenerPorId: vi.fn(async () => null),
      }),
    );

    await expect(caso.ejecutar("plant-inexistente")).rejects.toThrow();
  });
});

describe("ObtenerPlantillasAntropometricas", () => {
  it("devuelve las plantillas del consultorio", async () => {
    const caso = new ObtenerPlantillasAntropometricas(
      mockPlantillaAntropometricaRepositorio({
        listar: vi.fn(async () => [plantillaAntropometricaEjemplo()]),
      }),
    );

    expect(await caso.ejecutar()).toHaveLength(1);
  });
});

describe("EliminarObjetivoComposicion", () => {
  it("da de baja la meta cuando existe", async () => {
    const repositorio = mockObjetivoComposicionRepositorio({
      obtenerPorId: vi.fn(async () => objetivoComposicionEjemplo()),
    });
    const caso = new EliminarObjetivoComposicion(repositorio);

    await caso.ejecutar("objcomp-1");

    expect(repositorio.eliminar).toHaveBeenCalledWith("objcomp-1");
  });

  it("falla si la meta no existe, en vez de borrar en silencio", async () => {
    // Un borrado que no encuentra nada y no dice nada deja al profesional
    // creyendo que hizo algo.
    const repositorio = mockObjetivoComposicionRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const caso = new EliminarObjetivoComposicion(repositorio);

    await expect(caso.ejecutar("objcomp-inexistente")).rejects.toThrow();
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });
});
