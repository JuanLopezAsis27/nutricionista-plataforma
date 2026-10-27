import { describe, it, expect, vi } from "vitest";
import { Deporte, claveNombreDeporte } from "@/dominio/entidades/Deporte";
import { ErrorDeporteDuplicado } from "@/dominio/errores/ErrorDeporteDuplicado";
import { ErrorDeporteEnUso } from "@/dominio/errores/ErrorDeporteEnUso";
import { ErrorDeporteNoEncontrado } from "@/dominio/errores/ErrorDeporteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { CrearDeporte } from "./CrearDeporte";
import { RenombrarDeporte } from "./RenombrarDeporte";
import { EliminarDeporte } from "./EliminarDeporte";
import { ListarDeportes } from "./ListarDeportes";
import { CambiarPlanificacionDeDeporte } from "./CambiarPlanificacionDeDeporte";
import type { FormatoPlanificacion } from "@/dominio/entidades/PlanificacionDeportiva";
import {
  mockDeporteRepositorio,
  mockPerfilDeportivoRepositorio,
} from "../_ayudas-test";

/**
 * La lista de deportes de la plataforma (migración 97): la administra el
 * SUPERADMIN y de ahí sale el deporte de cada perfil deportivo.
 */

describe("Deporte", () => {
  it("compara el nombre sin mayúsculas, tildes ni espacios de más", () => {
    expect(claveNombreDeporte("  Fútbol   5 ")).toBe("futbol 5");
    expect(Deporte.crear({ nombre: "Pádel " }, "d1").claveNombre).toBe(
      Deporte.crear({ nombre: "padel" }, "d2").claveNombre,
    );
  });

  it("exige un nombre corto", () => {
    expect(() => Deporte.crear({ nombre: "   " }, "d1")).toThrow(ErrorValidacion);
    expect(() => Deporte.crear({ nombre: "x".repeat(81) }, "d1")).toThrow(ErrorValidacion);
  });
});

describe("CrearDeporte y RenombrarDeporte", () => {
  it("no deja dos deportes con el mismo nombre", async () => {
    const deportes = mockDeporteRepositorio([Deporte.crear({ nombre: "Fútbol" }, "d1")]);
    await expect(
      new CrearDeporte(deportes).ejecutar("futbol"),
    ).rejects.toBeInstanceOf(ErrorDeporteDuplicado);
    expect(deportes.crear).not.toHaveBeenCalled();
  });

  it("renombra sin chocar consigo mismo, y sí con otro", async () => {
    const deportes = mockDeporteRepositorio([
      Deporte.crear({ nombre: "Futbol" }, "d1"),
      Deporte.crear({ nombre: "Tenis" }, "d2"),
    ]);
    const renombrar = new RenombrarDeporte(deportes);

    const renombrado = await renombrar.ejecutar("d1", "Fútbol");
    expect(renombrado.nombre).toBe("Fútbol");
    await expect(renombrar.ejecutar("d1", "tenis")).rejects.toBeInstanceOf(
      ErrorDeporteDuplicado,
    );
    await expect(renombrar.ejecutar("nada", "Golf")).rejects.toBeInstanceOf(
      ErrorDeporteNoEncontrado,
    );
  });

  it("lista por nombre", async () => {
    const deportes = mockDeporteRepositorio([
      Deporte.crear({ nombre: "Tenis" }, "d1"),
      Deporte.crear({ nombre: "Atletismo" }, "d2"),
    ]);
    const lista = await new ListarDeportes(deportes).ejecutar();
    expect(lista.map((d) => d.nombre)).toEqual(["Atletismo", "Tenis"]);
  });
});

describe("CambiarPlanificacionDeDeporte (migración 98)", () => {
  it("le pone y le saca la planificación, sin tocar el nombre", async () => {
    const deportes = mockDeporteRepositorio([
      Deporte.crear({ nombre: "Trail running" }, "d1"),
    ]);
    const cambiar = new CambiarPlanificacionDeDeporte(deportes);

    const conTrail = await cambiar.ejecutar("d1", "CARRERA_TRAIL");
    expect(conTrail.formatoPlanificacion).toBe("CARRERA_TRAIL");
    expect(conTrail.nombre).toBe("Trail running");
    expect((await cambiar.ejecutar("d1", null)).formatoPlanificacion).toBeNull();
    await expect(cambiar.ejecutar("nada", null)).rejects.toBeInstanceOf(
      ErrorDeporteNoEncontrado,
    );
  });

  it("rechaza un formato que no existe", () => {
    expect(() =>
      Deporte.crear({ nombre: "Rugby" }, "d1").conFormato(
        "PARTIDO" as FormatoPlanificacion,
      ),
    ).toThrow(ErrorValidacion);
  });

  it("un deporte nuevo arranca sin planificación", () => {
    expect(
      Deporte.crear({ nombre: "Curling" }, "d1").formatoPlanificacion,
    ).toBeNull();
  });
});

describe("EliminarDeporte", () => {
  it("no borra un deporte que usa algún perfil, y dice cuántos", async () => {
    const deportes = mockDeporteRepositorio([Deporte.crear({ nombre: "Rugby" }, "d1")]);
    const perfiles = mockPerfilDeportivoRepositorio({
      contarPorDeporte: vi.fn(async () => 3),
    });

    const intento = new EliminarDeporte(deportes, perfiles).ejecutar("d1");
    await expect(intento).rejects.toBeInstanceOf(ErrorDeporteEnUso);
    await expect(intento).rejects.toThrow(/3 perfiles/);
    expect(deportes.eliminar).not.toHaveBeenCalled();
  });

  it("borra uno sin uso", async () => {
    const deportes = mockDeporteRepositorio([Deporte.crear({ nombre: "Golf" }, "d1")]);
    await new EliminarDeporte(
      deportes,
      mockPerfilDeportivoRepositorio(),
    ).ejecutar("d1");
    expect(deportes.eliminar).toHaveBeenCalledWith("d1");
  });
});
