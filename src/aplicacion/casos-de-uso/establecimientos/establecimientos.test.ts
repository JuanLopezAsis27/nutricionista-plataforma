import { describe, it, expect, vi } from "vitest";
import { CrearEstablecimiento } from "./CrearEstablecimiento";
import { ActualizarEstablecimiento } from "./ActualizarEstablecimiento";
import { ArchivarEstablecimiento } from "./ArchivarEstablecimiento";
import { RestaurarEstablecimiento } from "./RestaurarEstablecimiento";
import { FijarEstablecimientoPrincipal } from "./FijarEstablecimientoPrincipal";
import { ObtenerEstablecimientoVigente } from "./ObtenerEstablecimientoVigente";
import { ErrorEstablecimientoDuplicado } from "@/dominio/errores/ErrorEstablecimientoDuplicado";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockEstablecimientoRepositorio,
  establecimientoEjemplo,
} from "../_ayudas-test";

describe("CrearEstablecimiento", () => {
  it("rechaza un nombre que ya está en uso", async () => {
    const repo = mockEstablecimientoRepositorio({
      existeNombre: vi.fn(async () => true),
    });

    await expect(
      new CrearEstablecimiento(repo).ejecutar({ nombre: "Consultorio centro" }),
    ).rejects.toBeInstanceOf(ErrorEstablecimientoDuplicado);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("la primera sede del consultorio queda como principal", async () => {
    // Sin ninguna marcada, un turno que no elige sede no tendría dónde caer.
    const repo = mockEstablecimientoRepositorio({
      listar: vi.fn(async () => []),
    });

    const creada = await new CrearEstablecimiento(repo).ejecutar({
      nombre: "Consultorio centro",
    });

    expect(repo.fijarPrincipal).toHaveBeenCalledWith(creada.id);
    expect(creada.esPrincipal).toBe(true);
  });

  it("la segunda no toca a la principal existente", async () => {
    const repo = mockEstablecimientoRepositorio();

    const creada = await new CrearEstablecimiento(repo).ejecutar({
      nombre: "Consultorio barrio",
    });

    expect(repo.fijarPrincipal).not.toHaveBeenCalled();
    expect(creada.esPrincipal).toBe(false);
  });
});

describe("ActualizarEstablecimiento", () => {
  it("guarda la agenda nueva", async () => {
    const repo = mockEstablecimientoRepositorio();

    const guardada = await new ActualizarEstablecimiento(repo).ejecutar(
      "est-1",
      { diasAtencion: [2, 4], atencionHoraDesde: "14:00" },
    );

    expect(guardada.diasAtencion).toEqual([2, 4]);
    expect(guardada.atencionHoraDesde).toBe("14:00");
  });

  it("no choca consigo mismo al guardar sin renombrar", async () => {
    const repo = mockEstablecimientoRepositorio();

    await new ActualizarEstablecimiento(repo).ejecutar("est-1", {
      nombre: "Consultorio principal",
    });

    // El chequeo excluye la propia fila: sin eso, guardar sin tocar el nombre
    // se rechazaría a sí mismo.
    expect(repo.existeNombre).toHaveBeenCalledWith(
      "Consultorio principal",
      "est-1",
    );
  });

  it("lanza si la sede no existe", async () => {
    const repo = mockEstablecimientoRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });

    await expect(
      new ActualizarEstablecimiento(repo).ejecutar("est-x", { nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorEstablecimientoNoEncontrado);
  });
});

describe("ArchivarEstablecimiento", () => {
  it("no deja archivar la única sede activa", async () => {
    // Un consultorio sin ninguna sede vigente no puede agendar nada, y el
    // bloqueo se descubriría recién al intentar dar el próximo turno.
    const repo = mockEstablecimientoRepositorio();

    await expect(
      new ArchivarEstablecimiento(repo).ejecutar("est-1"),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("archiva y pasa el rol de principal a otra vigente", async () => {
    const principal = establecimientoEjemplo({}, "est-1");
    const otra = establecimientoEjemplo({ nombre: "Barrio" }, "est-2");
    const repo = mockEstablecimientoRepositorio({
      obtenerPorId: vi.fn(async () => principal),
      listar: vi.fn(async () => [principal, otra]),
    });

    const archivada = await new ArchivarEstablecimiento(repo).ejecutar("est-1");

    expect(archivada.estaArchivado).toBe(true);
    expect(archivada.esPrincipal).toBe(false);
    expect(repo.fijarPrincipal).toHaveBeenCalledWith("est-2");
  });
});

describe("RestaurarEstablecimiento", () => {
  it("rechaza restaurar si mientras tanto se creó otra con ese nombre", async () => {
    // La unicidad es solo entre vigentes: sin este chequeo el error vendría de
    // Postgres en vez de explicado.
    const cerrada = establecimientoEjemplo({}, "est-1").archivar();
    const repo = mockEstablecimientoRepositorio({
      obtenerPorId: vi.fn(async () => cerrada),
      existeNombre: vi.fn(async () => true),
    });

    await expect(
      new RestaurarEstablecimiento(repo).ejecutar("est-1"),
    ).rejects.toBeInstanceOf(ErrorEstablecimientoDuplicado);
  });

  it("la deja vigente cuando el nombre está libre", async () => {
    const cerrada = establecimientoEjemplo({}, "est-1").archivar();
    const repo = mockEstablecimientoRepositorio({
      obtenerPorId: vi.fn(async () => cerrada),
    });

    const restaurada = await new RestaurarEstablecimiento(repo).ejecutar(
      "est-1",
    );

    expect(restaurada.estaArchivado).toBe(false);
  });
});

describe("FijarEstablecimientoPrincipal", () => {
  it("no deja elegir una sede archivada", async () => {
    const cerrada = establecimientoEjemplo({}, "est-1").archivar();
    const repo = mockEstablecimientoRepositorio({
      obtenerPorId: vi.fn(async () => cerrada),
    });

    await expect(
      new FijarEstablecimientoPrincipal(repo).ejecutar("est-1"),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repo.fijarPrincipal).not.toHaveBeenCalled();
  });
});

describe("ObtenerEstablecimientoVigente", () => {
  it("devuelve la principal", async () => {
    const repo = mockEstablecimientoRepositorio();

    expect((await new ObtenerEstablecimientoVigente(repo).ejecutar())?.id).toBe(
      "est-1",
    );
  });

  it("cae en la primera vigente si no hay principal", async () => {
    const otra = establecimientoEjemplo({ nombre: "Barrio" }, "est-9");
    const repo = mockEstablecimientoRepositorio({
      obtenerPrincipal: vi.fn(async () => null),
      listar: vi.fn(async () => [otra]),
    });

    expect((await new ObtenerEstablecimientoVigente(repo).ejecutar())?.id).toBe(
      "est-9",
    );
  });

  it("devuelve null si el consultorio no tiene ninguna", async () => {
    const repo = mockEstablecimientoRepositorio({
      obtenerPrincipal: vi.fn(async () => null),
      listar: vi.fn(async () => []),
    });

    expect(await new ObtenerEstablecimientoVigente(repo).ejecutar()).toBeNull();
  });
});
