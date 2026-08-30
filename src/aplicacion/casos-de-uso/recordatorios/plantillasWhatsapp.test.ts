import { describe, it, expect, vi } from "vitest";
import { CrearPlantillaWhatsapp } from "./CrearPlantillaWhatsapp";
import { ActualizarPlantillaWhatsapp } from "./ActualizarPlantillaWhatsapp";
import { EliminarPlantillaWhatsapp } from "./EliminarPlantillaWhatsapp";
import { ListarPlantillasWhatsapp } from "./ListarPlantillasWhatsapp";
import { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlantillaWhatsappRepositorio,
  plantillaWhatsappEjemplo,
} from "../_ayudas-test";

/**
 * Tests del CRUD de plantillas de recordatorio por WhatsApp.
 *
 * Parecen cuatro casos de uso administrativos, pero sostienen una invariante
 * con consecuencia directa: **siempre tiene que haber exactamente una plantilla
 * predeterminada.** Sin ninguna, el barrido automático no manda nada; con dos,
 * elige cualquiera. En los dos escenarios el problema se descubre al día
 * siguiente, cuando los pacientes no recibieron el aviso o recibieron el
 * equivocado.
 */

function plantilla(
  cambios: Parameters<typeof plantillaWhatsappEjemplo>[0] = {},
  id = "pla-1",
) {
  return plantillaWhatsappEjemplo(cambios, id);
}

describe("CrearPlantillaWhatsapp", () => {
  it("la PRIMERA plantilla queda predeterminada aunque no lo pidan", async () => {
    // Decisión deliberada: sin predeterminada el barrido no manda nada, y eso
    // se descubre el día siguiente. Elegir por el profesional algo que puede
    // cambiar en un clic es mejor que dejarlo caer en ese pozo.
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => []),
    });
    const caso = new CrearPlantillaWhatsapp(repositorio);

    await caso.ejecutar({
      nombre: "Recordatorio",
      cuerpo: "Hola {{paciente}}",
      claveMeta: null,
      idiomaMeta: "es_AR",
      variablesMeta: [],
      predeterminada: false,
      activa: true,
    });

    const [creada] = (repositorio.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaWhatsapp];
    expect(creada.aPrimitivos().predeterminada).toBe(true);
  });

  it("una plantilla posterior NO se vuelve predeterminada sola", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => [plantilla({ predeterminada: true })]),
    });
    const caso = new CrearPlantillaWhatsapp(repositorio);

    await caso.ejecutar({
      nombre: "Otra",
      cuerpo: "Hola",
      claveMeta: null,
      idiomaMeta: "es_AR",
      variablesMeta: [],
      predeterminada: false,
      activa: true,
    });

    const [creada] = (repositorio.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [PlantillaWhatsapp];
    expect(creada.aPrimitivos().predeterminada).toBe(false);
  });

  it("marcar una nueva como predeterminada desmarca la anterior", async () => {
    // La regla que evita que queden DOS predeterminadas y el barrido elija
    // cualquiera de las dos.
    const anterior = plantilla({ predeterminada: true }, "pla-vieja");
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => [anterior]),
    });
    const caso = new CrearPlantillaWhatsapp(repositorio);

    await caso.ejecutar({
      nombre: "Nueva",
      cuerpo: "Hola",
      claveMeta: null,
      idiomaMeta: "es_AR",
      variablesMeta: [],
      predeterminada: true,
      activa: true,
    });

    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    const [desmarcada] = (repositorio.actualizar as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [PlantillaWhatsapp];
    expect(desmarcada.aPrimitivos().id).toBe("pla-vieja");
    expect(desmarcada.aPrimitivos().predeterminada).toBe(false);
  });
});

describe("ActualizarPlantillaWhatsapp", () => {
  it("falla si la plantilla no existe", async () => {
    const caso = new ActualizarPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio({
        obtenerPorId: vi.fn(async () => null),
      }),
    );

    await expect(caso.ejecutar("pla-inexistente", {})).rejects.toThrow();
  });

  it("al marcarla predeterminada desmarca las otras, no a sí misma", async () => {
    // El `idNueva` del helper existe justamente para esto: sin excluirse, la
    // plantilla se desmarcaría a sí misma en el mismo acto de marcarse.
    const editada = plantilla({ predeterminada: false }, "pla-1");
    const otra = plantilla({ predeterminada: true }, "pla-2");
    const repositorio = mockPlantillaWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => editada),
      listar: vi.fn(async () => [editada, otra]),
    });
    const caso = new ActualizarPlantillaWhatsapp(repositorio);

    await caso.ejecutar("pla-1", { predeterminada: true });

    const desmarcadas = (
      repositorio.actualizar as ReturnType<typeof vi.fn>
    ).mock.calls.map(([p]) => (p as PlantillaWhatsapp).aPrimitivos());

    expect(desmarcadas.some((p) => p.id === "pla-2" && !p.predeterminada)).toBe(
      true,
    );
    // La última escritura es la de la plantilla editada, ya predeterminada.
    expect(desmarcadas.at(-1)?.id).toBe("pla-1");
    expect(desmarcadas.at(-1)?.predeterminada).toBe(true);
  });

  it("un cambio que no toca `predeterminada` no desmarca nada", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => plantilla({ predeterminada: true })),
      listar: vi.fn(async () => []),
    });
    const caso = new ActualizarPlantillaWhatsapp(repositorio);

    await caso.ejecutar("pla-1", { nombre: "Otro nombre" });

    expect(repositorio.listar).not.toHaveBeenCalled();
    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
  });
});

describe("EliminarPlantillaWhatsapp", () => {
  it("NO deja borrar la predeterminada", async () => {
    // Borrarla dejaría al envío automático sin con qué mandar, y eso se nota
    // el día en que los pacientes no reciben el aviso. Para reemplazarla hay
    // que marcar otra primero: una decisión explícita y reversible.
    const repositorio = mockPlantillaWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => plantilla({ predeterminada: true })),
    });
    const caso = new EliminarPlantillaWhatsapp(repositorio);

    await expect(caso.ejecutar("pla-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  it("deja borrar una que no es la predeterminada", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => plantilla({ predeterminada: false })),
    });
    const caso = new EliminarPlantillaWhatsapp(repositorio);

    await caso.ejecutar("pla-1");

    expect(repositorio.eliminar).toHaveBeenCalledWith("pla-1");
  });

  it("falla si la plantilla no existe", async () => {
    const caso = new EliminarPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio({
        obtenerPorId: vi.fn(async () => null),
      }),
    );

    await expect(caso.ejecutar("pla-inexistente")).rejects.toThrow();
  });
});

describe("ListarPlantillasWhatsapp", () => {
  it("devuelve lo que da el repositorio, sin filtrar", async () => {
    // La pantalla de gestión muestra también las inactivas: son editables y
    // reactivables, y esconderlas las volvería irrecuperables desde la UI.
    const activa = plantilla({ activa: true }, "pla-activa");
    const inactiva = plantilla({ activa: false }, "pla-inactiva");
    const caso = new ListarPlantillasWhatsapp(
      mockPlantillaWhatsappRepositorio({
        listar: vi.fn(async () => [activa, inactiva]),
      }),
    );

    expect((await caso.ejecutar()).map((p) => p.aPrimitivos().id)).toEqual([
      "pla-activa",
      "pla-inactiva",
    ]);
  });
});
