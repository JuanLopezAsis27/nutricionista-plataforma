import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientes } from "./ObtenerPacientes";
import { mockPacienteRepositorio, pacienteEjemplo } from "../_ayudas-test";

describe("ObtenerPacientes", () => {
  it("calcula el desplazamiento y el total de páginas", async () => {
    const listar = vi.fn(async () => [pacienteEjemplo()]);
    const contar = vi.fn(async () => 25);
    const repositorio = mockPacienteRepositorio({ listar, contar });
    const casoUso = new ObtenerPacientes(repositorio);

    const resultado = await casoUso.ejecutar({ pagina: 2, porPagina: 10 });

    expect(listar).toHaveBeenCalledWith({
      busqueda: undefined,
      limite: 10,
      desplazamiento: 10,
    });
    expect(resultado.total).toBe(25);
    expect(resultado.paginas).toBe(3);
    expect(resultado.pacientes).toHaveLength(1);
  });

  it("devuelve al menos una página aunque no haya resultados", async () => {
    const repositorio = mockPacienteRepositorio();
    const casoUso = new ObtenerPacientes(repositorio);

    const resultado = await casoUso.ejecutar({ pagina: 1, porPagina: 20 });

    expect(resultado.total).toBe(0);
    expect(resultado.paginas).toBe(1);
  });
});
