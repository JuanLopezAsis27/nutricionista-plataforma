import { describe, it, expect, vi } from "vitest";
import { GuardarCampoHistoriaClinica } from "./GuardarCampoHistoriaClinica";
import { EliminarCampoHistoriaClinica } from "./EliminarCampoHistoriaClinica";
import { ObtenerCamposHistoriaClinica } from "./ObtenerCamposHistoriaClinica";
import {
  CampoHistoriaClinica,
  MAXIMO_CAMPOS_PERSONALIZADOS,
} from "@/dominio/entidades/CampoHistoriaClinica";
import { ErrorCampoHistoriaClinicaNoEncontrado } from "@/dominio/errores/ErrorCampoHistoriaClinicaNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { mockCampoHistoriaClinicaRepositorio } from "../_ayudas-test";

function campoEjemplo(nombre = "Adherencia previa", id = "campo-1") {
  return CampoHistoriaClinica.crear({ nombre, orden: 1 }, id);
}

describe("GuardarCampoHistoriaClinica", () => {
  it("crea un campo nuevo", async () => {
    const campos = mockCampoHistoriaClinicaRepositorio();
    const casoUso = new GuardarCampoHistoriaClinica(campos);

    const campo = await casoUso.ejecutar({ nombre: "Suplementos" });

    expect(campo.nombre).toBe("Suplementos");
    expect(campos.crear).toHaveBeenCalledOnce();
  });

  it("ubica el campo nuevo al final", async () => {
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerTodos: vi.fn(async () => [
        CampoHistoriaClinica.crear({ nombre: "Uno", orden: 5 }, "c-1"),
      ]),
    });
    const casoUso = new GuardarCampoHistoriaClinica(campos);

    const campo = await casoUso.ejecutar({ nombre: "Dos" });

    expect(campo.orden).toBe(6);
  });

  it("renombra el existente preservando su clave", async () => {
    const existente = campoEjemplo();
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerPorId: vi.fn(async () => existente),
    });
    const casoUso = new GuardarCampoHistoriaClinica(campos);

    const campo = await casoUso.ejecutar({
      id: "campo-1",
      nombre: "Adherencia al plan",
    });

    expect(campo.clave).toBe(existente.clave);
    expect(campo.nombre).toBe("Adherencia al plan");
    expect(campos.actualizar).toHaveBeenCalledOnce();
    expect(campos.crear).not.toHaveBeenCalled();
  });

  it("rechaza un nombre que ya usa otro campo", async () => {
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerPorNombre: vi.fn(async () => campoEjemplo("Suplementos", "otro")),
    });
    const casoUso = new GuardarCampoHistoriaClinica(campos);

    await expect(casoUso.ejecutar({ nombre: "Suplementos" })).rejects.toThrow(
      ErrorValidacion,
    );
  });

  it("deja renombrar un campo con su propio nombre", async () => {
    const existente = campoEjemplo("Suplementos");
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerPorNombre: vi.fn(async () => existente),
      obtenerPorId: vi.fn(async () => existente),
    });
    const casoUso = new GuardarCampoHistoriaClinica(campos);

    await expect(
      casoUso.ejecutar({ id: "campo-1", nombre: "Suplementos" }),
    ).resolves.toBeDefined();
  });

  it("rechaza editar un campo que no existe", async () => {
    const casoUso = new GuardarCampoHistoriaClinica(
      mockCampoHistoriaClinicaRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "no-existe", nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorCampoHistoriaClinicaNoEncontrado);
  });

  it("rechaza pasarse del tope de campos", async () => {
    const llenos = Array.from(
      { length: MAXIMO_CAMPOS_PERSONALIZADOS },
      (_, indice) => campoEjemplo(`Campo ${indice}`, `c-${indice}`),
    );
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerTodos: vi.fn(async () => llenos),
    });
    const casoUso = new GuardarCampoHistoriaClinica(campos);

    await expect(casoUso.ejecutar({ nombre: "Uno más" })).rejects.toThrow(
      ErrorValidacion,
    );
  });
});

describe("EliminarCampoHistoriaClinica", () => {
  it("elimina la definición", async () => {
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerPorId: vi.fn(async () => campoEjemplo()),
    });
    const casoUso = new EliminarCampoHistoriaClinica(campos);

    await casoUso.ejecutar("campo-1");

    expect(campos.eliminar).toHaveBeenCalledWith("campo-1");
  });

  it("rechaza si el campo no existe", async () => {
    const casoUso = new EliminarCampoHistoriaClinica(
      mockCampoHistoriaClinicaRepositorio(),
    );

    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorCampoHistoriaClinicaNoEncontrado,
    );
  });
});

describe("ObtenerCamposHistoriaClinica", () => {
  it("devuelve los campos del consultorio", async () => {
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerTodos: vi.fn(async () => [campoEjemplo()]),
    });

    const resultado = await new ObtenerCamposHistoriaClinica(campos).ejecutar();

    expect(resultado).toHaveLength(1);
  });
});
