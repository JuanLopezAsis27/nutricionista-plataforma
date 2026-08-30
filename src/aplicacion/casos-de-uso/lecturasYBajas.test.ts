import { describe, it, expect, vi } from "vitest";
import { EliminarAxioma } from "./axiomas/EliminarAxioma";
import { ListarAxiomas } from "./axiomas/ListarAxiomas";
import { ListarAxiomasActivos } from "./axiomas/ListarAxiomasActivos";
import { EliminarCompetencia } from "./deportivo/EliminarCompetencia";
import { ListarCompetencias } from "./deportivo/ListarCompetencias";
import { ObtenerPerfilDeportivo } from "./deportivo/ObtenerPerfilDeportivo";
import { ObtenerConfiguracion } from "./configuracion/ObtenerConfiguracion";
import { ObtenerGruposPlan } from "./grupos-plan/ObtenerGruposPlan";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import {
  mockAxiomaRepositorio,
  mockCompetenciaRepositorio,
  mockPerfilDeportivoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockGrupoPlanRepositorio,
  pacienteEjemplo,
  axiomaEjemplo,
  competenciaEjemplo,
} from "./_ayudas-test";

/**
 * Tests de los casos de uso de lectura y baja que quedaban sin cubrir.
 *
 * Son cortos, y esa brevedad es justamente lo que los volvía fáciles de dejar
 * afuera. Pero cada uno sostiene una de estas dos decisiones, que sí importan:
 *
 * 1. **El guard de pertenencia.** Varios lectores piden el paciente antes de
 *    devolver sus datos, aunque no lo usen para nada más. No es redundante: es
 *    lo que hace que un id de otro consultorio devuelva "no encontrado" en vez
 *    del dato. La extensión de Prisma filtra por inquilino, y este guard es la
 *    segunda vuelta de esa misma llave.
 * 2. **Una baja que no encuentra nada FALLA**, no devuelve en silencio. Un
 *    borrado silencioso deja al profesional creyendo que hizo algo.
 */

describe("Axiomas — listar y eliminar", () => {
  it("listar y listarActivos son consultas DISTINTAS", async () => {
    // `listarActivos` es la que alimenta a la IA y al tracking; `listar` es la
    // pantalla de gestión, que también muestra los apagados. Que el caso de uso
    // llame al método equivocado se ve solo cuando la IA empieza a razonar con
    // axiomas que el profesional había desactivado.
    const repositorio = mockAxiomaRepositorio();

    await new ListarAxiomas(repositorio).ejecutar();
    expect(repositorio.listar).toHaveBeenCalledTimes(1);
    expect(repositorio.listarActivos).not.toHaveBeenCalled();

    await new ListarAxiomasActivos(repositorio).ejecutar();
    expect(repositorio.listarActivos).toHaveBeenCalledTimes(1);
  });

  it("eliminar falla si el axioma no existe", async () => {
    const repositorio = mockAxiomaRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });

    await expect(
      new EliminarAxioma(repositorio).ejecutar("ax-inexistente"),
    ).rejects.toThrow();
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  it("eliminar borra el axioma que existe", async () => {
    const repositorio = mockAxiomaRepositorio({
      obtenerPorId: vi.fn(async () => axiomaEjemplo()),
    });

    await new EliminarAxioma(repositorio).ejecutar("ax-1");

    expect(repositorio.eliminar).toHaveBeenCalledWith("ax-1");
  });
});

describe("Deportivo — el guard de pertenencia", () => {
  it("ListarCompetencias exige que el paciente exista ANTES de leer", async () => {
    // El guard es lo que evita que un id de otro consultorio devuelva datos.
    const competencias = mockCompetenciaRepositorio();
    const caso = new ListarCompetencias(
      competencias,
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
    );

    await expect(caso.ejecutar("pac-de-otro")).rejects.toThrow();
    expect(competencias.listarPorPaciente).not.toHaveBeenCalled();
  });

  it("ListarCompetencias devuelve las del paciente cuando existe", async () => {
    const competencias = mockCompetenciaRepositorio({
      listarPorPaciente: vi.fn(async () => [competenciaEjemplo()]),
    });
    const caso = new ListarCompetencias(
      competencias,
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    expect(await caso.ejecutar("pac-1")).toHaveLength(1);
  });

  it("ObtenerPerfilDeportivo aplica el mismo guard", async () => {
    const perfiles = mockPerfilDeportivoRepositorio();
    const caso = new ObtenerPerfilDeportivo(
      perfiles,
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
    );

    await expect(caso.ejecutar("pac-de-otro")).rejects.toThrow();
    expect(perfiles.obtenerPorPaciente).not.toHaveBeenCalled();
  });

  it("ObtenerPerfilDeportivo devuelve null si el paciente NO es deportista", async () => {
    // Distinción importante: "el paciente no existe" lanza, "el paciente existe
    // pero no cargó perfil deportivo" devuelve null. La pestaña Deporte se
    // muestra vacía en el segundo caso, no rota.
    const caso = new ObtenerPerfilDeportivo(
      mockPerfilDeportivoRepositorio({
        obtenerPorPaciente: vi.fn(async () => null),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    expect(await caso.ejecutar("pac-1")).toBeNull();
  });

  it("EliminarCompetencia falla si la competencia no existe", async () => {
    const competencias = mockCompetenciaRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });

    await expect(
      new EliminarCompetencia(competencias).ejecutar("comp-inexistente"),
    ).rejects.toThrow();
    expect(competencias.eliminar).not.toHaveBeenCalled();
  });
});

describe("ObtenerConfiguracion", () => {
  it("devuelve la de fábrica mientras el consultorio no guardó nada", async () => {
    // La misma decisión que en la configuración de recordatorios: la política
    // vigente existe antes de que nadie la guarde. Sin esto, un consultorio
    // recién dado de alta tendría la agenda sin horarios y el PDF sin marca.
    const caso = new ObtenerConfiguracion(
      mockConfiguracionRepositorio({ obtener: vi.fn(async () => null) }),
    );

    const config = await caso.ejecutar();

    expect(config).toBeInstanceOf(ConfiguracionConsultorio);
    expect(config.aPrimitivos().turnoDuracionMinutos).toBeGreaterThan(0);
  });

  it("devuelve la guardada cuando existe", async () => {
    const guardada = ConfiguracionConsultorio.porDefecto();
    const caso = new ObtenerConfiguracion(
      mockConfiguracionRepositorio({ obtener: vi.fn(async () => guardada) }),
    );

    expect(await caso.ejecutar()).toBe(guardada);
  });
});

describe("ObtenerGruposPlan", () => {
  it("delega en el repositorio, que resuelve los conteos", async () => {
    // El conteo de planes y plantillas por carpeta lo hace el repositorio en
    // dos consultas, no el caso de uso: subirlo acá lo convertiría en un N+1.
    const repositorio = mockGrupoPlanRepositorio();
    await new ObtenerGruposPlan(repositorio).ejecutar();

    expect(repositorio.listar).toHaveBeenCalledTimes(1);
  });
});
