import { describe, it, expect, vi } from "vitest";
import { CrearPacienteDesdeFicha } from "./CrearPacienteDesdeFicha";
import { CrearPaciente } from "./CrearPaciente";
import { DarAccesoPortal } from "../acceso-portal/DarAccesoPortal";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockHistoriaClinicaRepositorio,
  mockAntropometriaRepositorio,
  mockLaboratorioRepositorio,
  mockArchivoRepositorio,
  mockConfiguracionRepositorio,
  mockHasheador,
} from "../_ayudas-test";

function armar(
  sobrescribir: {
    historias?: ReturnType<typeof mockHistoriaClinicaRepositorio>;
    antropometrias?: ReturnType<typeof mockAntropometriaRepositorio>;
    laboratorios?: ReturnType<typeof mockLaboratorioRepositorio>;
    archivos?: ReturnType<typeof mockArchivoRepositorio>;
  } = {},
) {
  const historias = sobrescribir.historias ?? mockHistoriaClinicaRepositorio();
  const antropometrias =
    sobrescribir.antropometrias ?? mockAntropometriaRepositorio();
  const laboratorios =
    sobrescribir.laboratorios ?? mockLaboratorioRepositorio();
  const archivos = sobrescribir.archivos ?? mockArchivoRepositorio();

  // El alta de estos tests no pide acceso al portal: lo que se prueba acá es
  // lo que el documento trae además del paciente.
  const crearPaciente = new CrearPaciente(
    mockPacienteRepositorio(),
    mockConfiguracionRepositorio(),
    new DarAccesoPortal(
      mockPacienteRepositorio(),
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockHasheador(),
    ),
  );

  return {
    casoUso: new CrearPacienteDesdeFicha(
      crearPaciente,
      historias,
      antropometrias,
      laboratorios,
      archivos,
    ),
    historias,
    antropometrias,
    laboratorios,
    archivos,
  };
}

const BASE = {
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@ejemplo.com",
  acceso: null,
};

describe("CrearPacienteDesdeFicha", () => {
  it("crea el paciente y todo lo que traía el documento", async () => {
    const { casoUso, historias, antropometrias, laboratorios } = armar();

    const { paciente, advertencias } = await casoUso.ejecutar({
      ...BASE,
      historiaClinica: { motivoConsulta: "Descenso de peso" },
      antropometria: { pesoKg: 70, fecha: new Date("2026-01-10T00:00:00Z") },
      laboratorios: [
        { fecha: new Date("2026-01-05T00:00:00Z"), titulo: "Perfil lipídico" },
      ],
    });

    expect(paciente.email).toBe("ana@ejemplo.com");
    expect(advertencias).toEqual([]);
    expect(historias.guardar).toHaveBeenCalledOnce();
    expect(antropometrias.crear).toHaveBeenCalledOnce();
    expect(laboratorios.crear).toHaveBeenCalledOnce();
  });

  it("no crea historia clínica si el documento no traía ninguna", async () => {
    const { casoUso, historias } = armar();

    const { advertencias } = await casoUso.ejecutar({
      ...BASE,
      historiaClinica: {
        motivoConsulta: null,
        camposPersonalizados: [],
      },
    });

    // Una historia vacía no se guarda, y eso NO es una advertencia.
    expect(historias.guardar).not.toHaveBeenCalled();
    expect(advertencias).toEqual([]);
  });

  it("crea la historia si solo trae campos personalizados", async () => {
    const { casoUso, historias } = armar();

    await casoUso.ejecutar({
      ...BASE,
      historiaClinica: {
        camposPersonalizados: [
          { clave: "suplementos-11", etiqueta: "Suplementos", valor: "Vit D" },
        ],
      },
    });

    expect(historias.guardar).toHaveBeenCalledOnce();
  });

  it("vincula el documento leído a la ficha del paciente", async () => {
    const { casoUso, archivos } = armar();

    const { paciente } = await casoUso.ejecutar({
      ...BASE,
      archivoId: "arch-1",
    });

    expect(archivos.vincularDueno).toHaveBeenCalledWith("arch-1", {
      pacienteId: paciente.id,
    });
  });

  it("informa lo que no pudo guardar sin perder el paciente ni el resto", async () => {
    // El paciente ya existe cuando falla un asociado: una historia que no se
    // pudo guardar no puede tumbar el alta entera ni llevarse puesta la medición.
    const historias = mockHistoriaClinicaRepositorio({
      guardar: vi.fn(async () => {
        throw new Error("la base dijo que no");
      }),
    });
    const { casoUso, antropometrias } = armar({ historias });

    const { paciente, advertencias } = await casoUso.ejecutar({
      ...BASE,
      historiaClinica: { alergiasIntolerancias: "Alergia al maní" },
      antropometria: { pesoKg: 70, fecha: new Date("2026-01-10T00:00:00Z") },
    });

    expect(paciente.email).toBe("ana@ejemplo.com");
    expect(advertencias).toHaveLength(1);
    expect(advertencias[0]).toContain("la historia clínica");
    expect(advertencias[0]).toContain("la base dijo que no");
    expect(antropometrias.crear).toHaveBeenCalledOnce();
  });

  it("informa una medición inválida en vez de lanzar", async () => {
    const { casoUso } = armar();

    const { advertencias } = await casoUso.ejecutar({
      ...BASE,
      // Un peso fuera de rango: la entidad lo rechaza.
      antropometria: { pesoKg: 5000, fecha: new Date("2026-01-10T00:00:00Z") },
    });

    expect(advertencias).toHaveLength(1);
    expect(advertencias[0]).toContain("la medición inicial");
  });
});
