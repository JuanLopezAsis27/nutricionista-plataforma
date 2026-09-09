import { describe, it, expect, vi } from "vitest";
import { ObtenerRegistrosPaginados } from "./ObtenerRegistrosPaginados";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

describe("ObtenerRegistrosPaginados", () => {
  it("pide la página con el desplazamiento correcto y devuelve el total de páginas", async () => {
    const listarPaginado = vi.fn(async () => [registroDiarioEjemplo()]);
    const contarRegistros = vi.fn(async () => 25);
    const casoUso = new ObtenerRegistrosPaginados(
      mockRegistroDiarioRepositorio({ listarPaginado, contarRegistros }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const pagina = await casoUso.ejecutar("pac-1", {
      pagina: 3,
      porPagina: 10,
    });

    expect(listarPaginado).toHaveBeenCalledWith("pac-1", 10, 20);
    expect(pagina.items).toHaveLength(1);
    expect(pagina.total).toBe(25);
    expect(pagina.paginas).toBe(3);
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerRegistrosPaginados(
      mockRegistroDiarioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar("no-existe", { pagina: 1, porPagina: 10 }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("con historia vacía devuelve una sola página", async () => {
    const casoUso = new ObtenerRegistrosPaginados(
      mockRegistroDiarioRepositorio({
        listarPaginado: vi.fn(async () => []),
        contarRegistros: vi.fn(async () => 0),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const pagina = await casoUso.ejecutar("pac-1", {
      pagina: 1,
      porPagina: 10,
    });

    expect(pagina.items).toHaveLength(0);
    expect(pagina.paginas).toBe(1);
  });
});
