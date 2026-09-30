import { describe, it, expect, vi } from "vitest";
import { numeroDeFicha } from "./numeroCompartido";
import { mockPacienteRepositorio, pacienteEjemplo } from "../_ayudas-test";

/** La conversación de WhatsApp es del NÚMERO, no de la ficha (migración 81). */
describe("numeroDeFicha", () => {
  const madre = "+5491122223333";
  const hijo = pacienteEjemplo({ nombre: "Tomás", telefono: madre }, "pac-1");
  const hija = pacienteEjemplo({ nombre: "Lucía", telefono: madre }, "pac-2");

  it("devuelve el número y las OTRAS fichas que lo comparten", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => hijo),
      listarPorTelefonoE164: vi.fn(async () => [hijo, hija]),
    });

    const resultado = await numeroDeFicha(pacientes, "pac-1");

    expect(resultado.telefono).toBe(hijo.telefonoE164);
    expect(pacientes.listarPorTelefonoE164).toHaveBeenCalledWith(
      hijo.telefonoE164,
    );
    // La propia ficha no se cuenta como «otra».
    expect(resultado.otras.map((p) => p.id)).toEqual(["pac-2"]);
  });

  it("una ficha sin teléfono no comparte nada y no busca", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({ telefono: null })),
    });

    expect(await numeroDeFicha(pacientes, "pac-1")).toEqual({
      telefono: null,
      otras: [],
    });
    expect(pacientes.listarPorTelefonoE164).not.toHaveBeenCalled();
  });

  it("una ficha que no existe tampoco", async () => {
    const pacientes = mockPacienteRepositorio();

    expect(await numeroDeFicha(pacientes, "pac-x")).toEqual({
      telefono: null,
      otras: [],
    });
  });
});
