import { describe, it, expect, vi } from "vitest";
import { CrearPlantillaEmailRecordatorio } from "./CrearPlantillaEmailRecordatorio";
import { ActualizarPlantillaEmailRecordatorio } from "./ActualizarPlantillaEmailRecordatorio";
import { EliminarPlantillaEmailRecordatorio } from "./EliminarPlantillaEmailRecordatorio";
import { ListarPlantillasEmailRecordatorio } from "./ListarPlantillasEmailRecordatorio";
import type { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlantillaEmailRecordatorioRepositorio,
  plantillaEmailRecordatorioEjemplo,
} from "../_ayudas-test";

/**
 * Tests del CRUD de plantillas de recordatorio por email.
 *
 * Espejo de `plantillasWhatsapp.test.ts`: las mismas dos invariantes
 * (exactamente una predeterminada, un día para UN solo texto) aplican acá
 * porque el barrido las lee de la misma manera para los dos medios.
 */

function plantilla(
  cambios: Parameters<typeof plantillaEmailRecordatorioEjemplo>[0] = {},
  id = "pla-1",
) {
  return plantillaEmailRecordatorioEjemplo(cambios, id);
}

describe("CrearPlantillaEmailRecordatorio", () => {
  it("la PRIMERA plantilla queda predeterminada aunque no lo pidan", async () => {
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      listar: vi.fn(async () => []),
    });
    const caso = new CrearPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar({
      nombre: "Recordatorio",
      asunto: "Asunto",
      cuerpoHtml: "<p>Hola {{paciente}}</p>",
      diasAntes: null,
      predeterminada: false,
      activa: true,
      incluirBotonConfirmacion: true,
    });

    const [creada] = (repositorio.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaEmailRecordatorio];
    expect(creada.aPrimitivos().predeterminada).toBe(true);
  });

  it("una plantilla posterior NO se vuelve predeterminada sola", async () => {
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      listar: vi.fn(async () => [plantilla({ predeterminada: true })]),
    });
    const caso = new CrearPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar({
      nombre: "Otra",
      asunto: "Asunto",
      cuerpoHtml: "<p>Hola</p>",
      diasAntes: null,
      predeterminada: false,
      activa: true,
      incluirBotonConfirmacion: true,
    });

    const [creada] = (repositorio.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaEmailRecordatorio];
    expect(creada.aPrimitivos().predeterminada).toBe(false);
  });

  it("marcar una nueva como predeterminada desmarca la anterior", async () => {
    const anterior = plantilla({ predeterminada: true }, "pla-vieja");
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      listar: vi.fn(async () => [anterior]),
    });
    const caso = new CrearPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar({
      nombre: "Nueva",
      asunto: "Asunto",
      cuerpoHtml: "<p>Hola</p>",
      diasAntes: null,
      predeterminada: true,
      activa: true,
      incluirBotonConfirmacion: true,
    });

    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    const [desmarcada] = (repositorio.actualizar as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [PlantillaEmailRecordatorio];
    expect(desmarcada.aPrimitivos().id).toBe("pla-vieja");
    expect(desmarcada.aPrimitivos().predeterminada).toBe(false);
  });

  it("asignarle un día a la nueva se lo saca a la que lo tenía", async () => {
    const conElDia = plantilla({ diasAntes: 3 }, "pla-3dias");
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      listar: vi.fn(async () => [conElDia]),
    });
    const caso = new CrearPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar({
      nombre: "Nueva",
      asunto: "Asunto",
      cuerpoHtml: "<p>Hola</p>",
      diasAntes: 3,
      predeterminada: false,
      activa: true,
      incluirBotonConfirmacion: true,
    });

    const [liberada] = (repositorio.actualizar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaEmailRecordatorio];
    expect(liberada.aPrimitivos().id).toBe("pla-3dias");
    expect(liberada.aPrimitivos().diasAntes).toBeNull();
  });
});

describe("ActualizarPlantillaEmailRecordatorio", () => {
  it("falla si la plantilla no existe", async () => {
    const caso = new ActualizarPlantillaEmailRecordatorio(
      mockPlantillaEmailRecordatorioRepositorio({
        obtenerPorId: vi.fn(async () => null),
      }),
    );

    await expect(caso.ejecutar("pla-inexistente", {})).rejects.toThrow();
  });

  it("al marcarla predeterminada desmarca las otras, no a sí misma", async () => {
    const editada = plantilla({ predeterminada: false }, "pla-1");
    const otra = plantilla({ predeterminada: true }, "pla-2");
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      obtenerPorId: vi.fn(async () => editada),
      listar: vi.fn(async () => [editada, otra]),
    });
    const caso = new ActualizarPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar("pla-1", { predeterminada: true });

    const desmarcadas = (
      repositorio.actualizar as ReturnType<typeof vi.fn>
    ).mock.calls.map(([p]) => (p as PlantillaEmailRecordatorio).aPrimitivos());

    expect(desmarcadas.some((p) => p.id === "pla-2" && !p.predeterminada)).toBe(
      true,
    );
    expect(desmarcadas.at(-1)?.id).toBe("pla-1");
    expect(desmarcadas.at(-1)?.predeterminada).toBe(true);
  });

  it("un cambio que no toca `predeterminada` ni `diasAntes` no desmarca nada", async () => {
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      obtenerPorId: vi.fn(async () => plantilla({ predeterminada: true })),
      listar: vi.fn(async () => []),
    });
    const caso = new ActualizarPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar("pla-1", { nombre: "Otro nombre" });

    expect(repositorio.listar).not.toHaveBeenCalled();
    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
  });
});

describe("EliminarPlantillaEmailRecordatorio", () => {
  it("NO deja borrar la predeterminada", async () => {
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      obtenerPorId: vi.fn(async () => plantilla({ predeterminada: true })),
    });
    const caso = new EliminarPlantillaEmailRecordatorio(repositorio);

    await expect(caso.ejecutar("pla-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  it("deja borrar una que no es la predeterminada", async () => {
    const repositorio = mockPlantillaEmailRecordatorioRepositorio({
      obtenerPorId: vi.fn(async () => plantilla({ predeterminada: false })),
    });
    const caso = new EliminarPlantillaEmailRecordatorio(repositorio);

    await caso.ejecutar("pla-1");

    expect(repositorio.eliminar).toHaveBeenCalledWith("pla-1");
  });
});

describe("ListarPlantillasEmailRecordatorio", () => {
  it("devuelve lo que da el repositorio, sin filtrar", async () => {
    const activa = plantilla({ activa: true }, "pla-activa");
    const inactiva = plantilla({ activa: false }, "pla-inactiva");
    const caso = new ListarPlantillasEmailRecordatorio(
      mockPlantillaEmailRecordatorioRepositorio({
        listar: vi.fn(async () => [activa, inactiva]),
      }),
    );

    expect((await caso.ejecutar()).map((p) => p.aPrimitivos().id)).toEqual([
      "pla-activa",
      "pla-inactiva",
    ]);
  });
});
