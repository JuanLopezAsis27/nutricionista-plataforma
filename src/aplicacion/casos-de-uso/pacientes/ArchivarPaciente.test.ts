import { describe, it, expect, vi } from "vitest";
import { ArchivarPaciente } from "./ArchivarPaciente";
import { ReactivarPaciente } from "./ReactivarPaciente";
import { Paciente } from "@/dominio/entidades/Paciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { mockPacienteRepositorio, pacienteEjemplo } from "../_ayudas-test";

/** Repositorio que devuelve `inicial` y captura lo que se guarda. */
function repoCon(inicial: Paciente | null) {
  const guardados: Paciente[] = [];
  const repositorio = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => inicial),
    actualizar: vi.fn(async (p: Paciente) => {
      guardados.push(p);
      return p;
    }),
  });
  return { repositorio, guardados };
}

describe("ArchivarPaciente", () => {
  it("marca la fecha de archivado y guarda el motivo", async () => {
    const { repositorio, guardados } = repoCon(pacienteEjemplo());

    const resultado = await new ArchivarPaciente(repositorio).ejecutar(
      "pac-1",
      "  Se mudó  ",
    );

    expect(resultado.estaArchivado).toBe(true);
    expect(resultado.archivadoEn).toBeInstanceOf(Date);
    expect(resultado.motivoArchivado).toBe("Se mudó");
    expect(guardados).toHaveLength(1);
  });

  it("conserva los datos clínicos: archivar no es borrar", async () => {
    const { repositorio } = repoCon(pacienteEjemplo({ notas: "Celíaca" }));

    const resultado = await new ArchivarPaciente(repositorio).ejecutar("pac-1");

    expect(resultado.notas).toBe("Celíaca");
    expect(resultado.email).toBe("ana@mail.com");
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  it("falla si el paciente no existe", async () => {
    const { repositorio } = repoCon(null);

    await expect(
      new ArchivarPaciente(repositorio).ejecutar("fantasma"),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("no deja archivar dos veces", async () => {
    const yaArchivado = pacienteEjemplo().archivar("baja");
    const { repositorio } = repoCon(yaArchivado);

    await expect(
      new ArchivarPaciente(repositorio).ejecutar("pac-1"),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("ReactivarPaciente", () => {
  it("vuelve a poner al paciente en seguimiento", async () => {
    const { repositorio } = repoCon(pacienteEjemplo().archivar("pausa"));

    const resultado = await new ReactivarPaciente(repositorio).ejecutar(
      "pac-1",
    );

    expect(resultado.estaArchivado).toBe(false);
    expect(resultado.archivadoEn).toBeNull();
    expect(resultado.motivoArchivado).toBeNull();
  });

  it("no reactiva a alguien que nunca se archivó", async () => {
    const { repositorio } = repoCon(pacienteEjemplo());

    await expect(
      new ReactivarPaciente(repositorio).ejecutar("pac-1"),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
