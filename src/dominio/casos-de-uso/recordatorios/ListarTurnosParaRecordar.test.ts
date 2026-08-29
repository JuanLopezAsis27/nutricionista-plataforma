import { describe, it, expect, vi } from "vitest";
import {
  ListarTurnosParaRecordar,
  DIAS_VENTANA_POR_DEFECTO,
  MAX_DIAS_VENTANA,
} from "./ListarTurnosParaRecordar";
import { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import type { Turno } from "../../entidades/Turno";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockRecordatorioWhatsappRepositorio,
  mockReloj,
  turnoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

/**
 * Tests de la lista que decide A QUIÉN se le ofrece mandar recordatorio.
 *
 * Es la contracara de `EnviarRecordatorioWhatsapp`: aquel decide si un envío
 * concreto sale, este decide quién aparece siquiera en la consola. Un error de
 * más ofrece mandarle a alguien que no corresponde; uno de menos deja pacientes
 * sin aviso y nadie se entera, porque lo que no aparece en la lista no se
 * extraña.
 */

const HOY = new Date("2026-07-01T00:00:00.000Z");

function enDias(dias: number): Date {
  return new Date(HOY.getTime() + dias * 24 * 60 * 60 * 1000);
}

function armar(opciones: {
  turnos?: Turno[];
  pacientes?: Record<string, ReturnType<typeof pacienteEjemplo> | null>;
  avisos?: Map<string, RecordatorioWhatsapp[]>;
  config?: ConfiguracionConsultorio | null;
}) {
  const turnos = opciones.turnos ?? [];
  const pacientes = opciones.pacientes ?? {};

  const repoTurnos = mockTurnoRepositorio({
    listarEntreFechas: vi.fn(async () => turnos),
  });
  const repoPacientes = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async (id: string) => pacientes[id] ?? null),
  });
  const repoConfig = mockConfiguracionRepositorio({
    obtener: vi.fn(async () =>
      opciones.config === undefined
        ? ConfiguracionConsultorio.porDefecto()
        : opciones.config,
    ),
  });
  const repoRecordatorios = mockRecordatorioWhatsappRepositorio({
    porTurnos: vi.fn(async () => opciones.avisos ?? new Map()),
  });

  return {
    caso: new ListarTurnosParaRecordar(
      repoTurnos,
      repoPacientes,
      repoConfig,
      repoRecordatorios,
      mockReloj(HOY),
    ),
    repoTurnos,
    repoPacientes,
  };
}

describe("ListarTurnosParaRecordar — a quién incluye", () => {
  it("deja fuera los turnos cancelados y completados", async () => {
    const pendiente = turnoEjemplo({ fecha: enDias(2) }, "t-pendiente");
    const cancelado = turnoEjemplo({ fecha: enDias(2) }, "t-cancelado");
    cancelado.cambiarEstado("CANCELADO");

    const { caso } = armar({
      turnos: [pendiente, cancelado],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
    });

    const lista = await caso.ejecutar();

    expect(lista.map((t) => t.turnoId)).toEqual(["t-pendiente"]);
  });

  it("deja fuera al paciente archivado", async () => {
    // Un paciente archivado sigue teniendo sus turnos viejos en la base.
    // Ofrecerle un recordatorio sería escribirle a alguien que se dio de baja.
    // Ojo con la asimetría del dominio: `Paciente.archivar` es INMUTABLE y
    // devuelve una instancia nueva, mientras que `Turno.cambiarEstado` muta la
    // propia. Descartar este retorno deja un paciente sin archivar y el test
    // pasa a verificar lo contrario de lo que dice su nombre.
    const archivado = pacienteEjemplo({ telefono: "1155554444" }).archivar(
      "alta",
      new Date(),
    );

    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": archivado },
    });

    expect(await caso.ejecutar()).toEqual([]);
  });

  it("deja fuera el turno cuyo paciente ya no existe", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": null },
    });

    expect(await caso.ejecutar()).toEqual([]);
  });

  it("incluye al paciente SIN teléfono, pero con el impedimento explícito", async () => {
    // Decisión de diseño que conviene fijar: no se lo esconde. El profesional
    // tiene que ver que ese turno existe y por qué no puede avisarle, en vez de
    // que desaparezca de la lista sin explicación.
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: null }) },
    });

    const lista = await caso.ejecutar();

    expect(lista).toHaveLength(1);
    expect(lista[0]!.telefono).toBeNull();
    expect(lista[0]!.impedimento).toBe("Sin teléfono cargado.");
  });

  it("no tiene impedimento cuando el paciente sí tiene teléfono", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
    });

    expect((await caso.ejecutar())[0]!.impedimento).toBeNull();
  });
});

describe("ListarTurnosParaRecordar — la ventana de días", () => {
  it("usa una semana cuando no se pide nada", async () => {
    const { caso, repoTurnos } = armar({ turnos: [] });

    await caso.ejecutar();

    const [desde, hasta] = (
      repoTurnos.listarEntreFechas as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [Date, Date];
    expect(desde).toEqual(HOY);
    expect(hasta).toEqual(enDias(DIAS_VENTANA_POR_DEFECTO));
  });

  it("recorta una ventana desmedida al máximo permitido", async () => {
    // Sin el tope, pedir 100.000 días haría un barrido de toda la tabla de
    // turnos y un `porTurnos` con miles de ids.
    const { caso, repoTurnos } = armar({ turnos: [] });

    await caso.ejecutar(99_999);

    const [, hasta] = (repoTurnos.listarEntreFechas as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [Date, Date];
    expect(hasta).toEqual(enDias(MAX_DIAS_VENTANA));
  });

  it("trata una ventana negativa como cero, no como el pasado", async () => {
    const { caso, repoTurnos } = armar({ turnos: [] });

    await caso.ejecutar(-5);

    const [desde, hasta] = (
      repoTurnos.listarEntreFechas as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [Date, Date];
    expect(hasta.getTime()).toBe(desde.getTime());
  });

  it("calcula los días que faltan desde hoy", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(3) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
    });

    expect((await caso.ejecutar())[0]!.diasFaltantes).toBe(3);
  });
});

describe("ListarTurnosParaRecordar — el estado de los avisos", () => {
  function aviso(
    id: string,
    estado: "ENVIADO" | "PREPARADO" | "DESCARTADO",
    diasAntes: number | null,
  ) {
    return RecordatorioWhatsapp.crear(
      {
        turnoId: "tur-1",
        pacienteId: "pac-1",
        telefono: "541155554444",
        mensaje: "Recordatorio",
        usuarioId: "user-1",
        diasAntes,
        estado,
      },
      id,
      HOY,
    );
  }

  it("devuelve TODOS los avisos del turno, no solo el último", async () => {
    // Con [3, 1] programados, saber que salió el de 3 días no dice nada sobre
    // el de 1 día. Si la consola mostrara solo el último, el profesional
    // creería que ya está cubierto.
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
      avisos: new Map([
        ["tur-1", [aviso("a-3", "ENVIADO", 3), aviso("a-1", "PREPARADO", 1)]],
      ]),
    });

    const lista = await caso.ejecutar();

    expect(lista[0]!.avisos).toHaveLength(2);
    expect(lista[0]!.avisos.map((a) => a.diasAntes)).toEqual([3, 1]);
  });

  it("`yaAvisado` es true solo si algún aviso SALIÓ", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
      avisos: new Map([["tur-1", [aviso("a-1", "ENVIADO", 1)]]]),
    });

    expect((await caso.ejecutar())[0]!.yaAvisado).toBe(true);
  });

  it("un borrador PREPARADO no cuenta como avisado", async () => {
    // El chat se abrió y nadie sabe si el mensaje se mandó. Ese turno sigue
    // necesitando atención, no menos: marcarlo como avisado lo sacaría del
    // radar del profesional justo cuando hay que revisarlo.
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
      avisos: new Map([["tur-1", [aviso("a-1", "PREPARADO", 1)]]]),
    });

    const lista = await caso.ejecutar();

    expect(lista[0]!.yaAvisado).toBe(false);
    // Pero el aviso SÍ figura: la consola tiene que poder mostrar que hay un
    // borrador sin resolver.
    expect(lista[0]!.avisos).toHaveLength(1);
  });

  it("un aviso DESCARTADO tampoco cuenta como avisado", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
      avisos: new Map([["tur-1", [aviso("a-1", "DESCARTADO", null)]]]),
    });

    expect((await caso.ejecutar())[0]!.yaAvisado).toBe(false);
  });

  it("un turno sin avisos sale con la lista vacía y sin avisar", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
    });

    const lista = await caso.ejecutar();

    expect(lista[0]!.avisos).toEqual([]);
    expect(lista[0]!.yaAvisado).toBe(false);
  });
});

describe("ListarTurnosParaRecordar — eficiencia y configuración", () => {
  it("pide cada paciente UNA vez aunque tenga varios turnos", async () => {
    // Un mismo paciente puede tener dos turnos en la ventana. Sin la caché,
    // una consola de 40 turnos hace 40 consultas de paciente.
    const { caso, repoPacientes } = armar({
      turnos: [
        turnoEjemplo({ fecha: enDias(1) }, "t-1"),
        turnoEjemplo({ fecha: enDias(2) }, "t-2"),
        turnoEjemplo({ fecha: enDias(3) }, "t-3"),
      ],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
    });

    const lista = await caso.ejecutar();

    expect(lista).toHaveLength(3);
    expect(repoPacientes.obtenerPorId).toHaveBeenCalledTimes(1);
  });

  it("no consulta avisos ni configuración si no hay turnos", async () => {
    // Corte temprano: el barrido corre por inquilino y la mayoría de los días
    // no tiene turnos en ventana.
    const { caso, repoPacientes } = armar({ turnos: [] });

    expect(await caso.ejecutar()).toEqual([]);
    expect(repoPacientes.obtenerPorId).not.toHaveBeenCalled();
  });

  it("normaliza el teléfono con el prefijo del consultorio", async () => {
    const config = ConfiguracionConsultorio.porDefecto().aPrimitivos();
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "612345678" }) },
      config: ConfiguracionConsultorio.reconstruir({
        ...config,
        whatsappPrefijoPais: "34",
      }),
    });

    expect((await caso.ejecutar())[0]!.telefono?.startsWith("34")).toBe(true);
  });

  it("funciona con el consultorio todavía sin configurar", async () => {
    const { caso } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) })],
      pacientes: { "pac-1": pacienteEjemplo({ telefono: "1155554444" }) },
      config: null,
    });

    expect(await caso.ejecutar()).toHaveLength(1);
  });
});
