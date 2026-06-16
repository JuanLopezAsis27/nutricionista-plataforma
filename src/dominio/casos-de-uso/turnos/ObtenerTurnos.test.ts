import { describe, it, expect, vi } from "vitest";
import { ObtenerTurnos } from "./ObtenerTurnos";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

describe("ObtenerTurnos", () => {
  it("delega los filtros al repositorio y devuelve la lista", async () => {
    const listar = vi.fn(async () => [turnoEjemplo()]);
    const repositorio = mockTurnoRepositorio({ listar });
    const casoUso = new ObtenerTurnos(repositorio);

    const filtro = { estado: "PENDIENTE" as const, pacienteId: "pac-1" };
    const turnos = await casoUso.ejecutar(filtro);

    expect(listar).toHaveBeenCalledWith(filtro);
    expect(turnos).toHaveLength(1);
  });

  it("funciona sin filtros", async () => {
    const repositorio = mockTurnoRepositorio();
    const casoUso = new ObtenerTurnos(repositorio);

    const turnos = await casoUso.ejecutar();

    expect(turnos).toEqual([]);
  });
});
