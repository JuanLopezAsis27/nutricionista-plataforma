import { describe, it, expect, vi } from "vitest";
import { EnviarRecordatoriosMasivos } from "./EnviarRecordatoriosMasivos";
import { EnviarRecordatorioWhatsapp } from "./EnviarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";
import type { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockPlantillaWhatsappRepositorio,
  mockConfiguracionRecordatoriosRepositorio,
  mockProveedorWhatsapp,
  turnoEjemplo,
  pacienteEjemplo,
  plantillaWhatsappEjemplo,
  configuracionRecordatoriosEjemplo,
  mockPlantillaEmailRepositorio,
  mockEmailEnviadoRepositorio,
  mockServicioEmail,
  mockReloj,
  plantillaEmailEjemplo,
} from "../_ayudas-test";

/**
 * Repositorio EN MEMORIA, no un mock con respuestas fijas.
 *
 * Es la diferencia que importa acá: los mocks devuelven siempre lo mismo, así
 * que un test con mocks no puede ver qué pasa al apretar "Enviar" DOS VECES
 * seguidas —que es exactamente el escenario que apilaba avisos—. Este guarda
 * lo que se le escribe y lo devuelve en la lectura siguiente, como la base.
 */
function repositorioEnMemoria(): IRecordatorioWhatsappRepositorio & {
  filas: Map<string, RecordatorioWhatsapp>;
} {
  const filas = new Map<string, RecordatorioWhatsapp>();

  return {
    filas,
    registrar: vi.fn(async (r: RecordatorioWhatsapp) => {
      filas.set(r.id, r);
      return r;
    }),
    actualizar: vi.fn(async (r: RecordatorioWhatsapp) => {
      filas.set(r.id, r);
      return r;
    }),
    obtenerPorId: vi.fn(async (id: string) => filas.get(id) ?? null),
    obtenerPorIdExterno: vi.fn(async () => null),
    obtenerPorTurnoYDias: vi.fn(async (turnoId: string, diasAntes: number) => {
      return (
        [...filas.values()].find(
          (r) => r.turnoId === turnoId && r.diasAntes === diasAntes,
        ) ?? null
      );
    }),
    porTurnos: vi.fn(async (turnoIds: string[]) => {
      const mapa = new Map<string, RecordatorioWhatsapp[]>();
      for (const fila of filas.values()) {
        if (!turnoIds.includes(fila.turnoId)) continue;
        mapa.set(fila.turnoId, [...(mapa.get(fila.turnoId) ?? []), fila]);
      }
      return mapa;
    }),
    pendientesDeConfirmar: vi.fn(async () =>
      [...filas.values()].filter((r) => r.pendiente),
    ),
    listar: vi.fn(async () => [...filas.values()]),
    sinRespuestaDePaciente: vi.fn(async () => []),
  };
}

function armar(horasEntreAvisos = 24) {
  const enviarEmail = vi.fn(async () => {});
  const emailPorTurno = new EnviarRecordatoriosPorEmail(
    mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => plantillaEmailEjemplo()),
    }),
    mockEmailEnviadoRepositorio(),
    mockTurnoRepositorio(),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ telefono: "011 15 5555-4444" }),
      ),
    }),
    mockServicioEmail({ enviar: enviarEmail }),
    mockReloj(),
    mockConfiguracionRecordatoriosRepositorio(),
    "Lic. Nutrición",
  );
  const recordatorios = repositorioEnMemoria();
  const proveedor = mockProveedorWhatsapp();
  const caso = new EnviarRecordatoriosMasivos(
    mockTurnoRepositorio({
      obtenerPorId: vi.fn(async (id: string) => turnoEjemplo({}, id)),
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ telefono: "011 15 5555-4444" }),
      ),
    }),
    mockConfiguracionRepositorio(),
    mockPlantillaWhatsappRepositorio({
      obtenerPredeterminada: vi.fn(async () => plantillaWhatsappEjemplo()),
    }),
    mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(async () =>
        configuracionRecordatoriosEjemplo({ horasEntreAvisos }),
      ),
    }),
    recordatorios,
    new EnviarRecordatorioWhatsapp(recordatorios, proveedor),
    emailPorTurno,
  );
  return { caso, recordatorios };
}

describe("apretar Enviar varias veces sobre el mismo turno", () => {
  // El bug que reportó el profesional: con el enlace wa.me nadie confirma nada,
  // y cada clic dejaba un aviso más colgado en el turno.
  it("deja UN solo aviso, sin importar cuántas veces se apriete", async () => {
    const { caso, recordatorios } = armar();

    for (let i = 0; i < 5; i += 1) {
      await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });
    }

    expect(recordatorios.filas.size).toBe(1);
    const [unico] = [...recordatorios.filas.values()];
    expect(unico!.estado).toBe("PREPARADO");
  });

  // El caso que se escapó en el arreglo anterior y que el profesional vio en
  // producción: descartar deja la fila en DESCARTADO, y el envío siguiente no
  // la reusaba. Preparar → descartar → preparar → descartar, sin techo.
  it("descartar y volver a mandar tampoco apila avisos", async () => {
    const { caso, recordatorios } = armar();

    for (let i = 0; i < 4; i += 1) {
      await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });
      const [vigente] = [...recordatorios.filas.values()];
      await recordatorios.actualizar(vigente!.descartar());
    }

    expect(recordatorios.filas.size).toBe(1);
  });

  // Ídem con los rechazos del proveedor: un intento que no llegó a ningún lado
  // no es historia, es el mismo aviso que todavía no salió.
  it("un envío fallido tampoco deja una fila por intento", async () => {
    const { caso, recordatorios } = armar();

    for (let i = 0; i < 4; i += 1) {
      await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });
      const [vigente] = [...recordatorios.filas.values()];
      await recordatorios.actualizar(
        vigente!.registrarFallo("Meta lo rechazó"),
      );
    }

    expect(recordatorios.filas.size).toBe(1);
  });

  // Confirmado el envío, insistir a propósito SÍ deja constancia aparte: el
  // historial tiene que poder decir "le mandé, y una semana después insistí".
  it("una vez confirmado, un reenvío deliberado sí crea otro aviso", async () => {
    const { caso, recordatorios } = armar();

    await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });
    const [borrador] = [...recordatorios.filas.values()];
    await recordatorios.actualizar(borrador!.confirmarEnvio());

    await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
      forzar: true,
    });

    expect(recordatorios.filas.size).toBe(2);
  });

  // El margen: "ya se le avisó" es temporal, no definitivo. Pasado el plazo se
  // puede volver a avisar sin apagar la protección de todo el lote, que era la
  // única salida que había antes.
  it("pasado el margen deja volver a avisar sin forzar", async () => {
    const { caso, recordatorios } = armar(1); // margen de 1 hora
    await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });

    const [borrador] = [...recordatorios.filas.values()];
    // El aviso salió hace dos horas: el margen de una ya venció.
    const haceDosHoras = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await recordatorios.actualizar(borrador!.confirmarEnvio(haceDosHoras));

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(resultado.omitidos).toBe(0);
    expect(recordatorios.filas.size).toBe(2);
  });

  it("dentro del margen omite aunque el turno sea el mismo", async () => {
    const { caso, recordatorios } = armar(24);
    await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });

    const [borrador] = [...recordatorios.filas.values()];
    await recordatorios.actualizar(borrador!.confirmarEnvio());

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(resultado.omitidos).toBe(1);
    expect(resultado.detalles[0]!.motivo).toContain("24 h");
    expect(recordatorios.filas.size).toBe(1);
  });

  // Sin `forzar`, un aviso ya confirmado bloquea: es la protección pedida.
  it("una vez confirmado, un envío normal se omite", async () => {
    const { caso, recordatorios } = armar();

    await caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" });
    const [borrador] = [...recordatorios.filas.values()];
    await recordatorios.actualizar(borrador!.confirmarEnvio());

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(resultado.omitidos).toBe(1);
    expect(recordatorios.filas.size).toBe(1);
  });
});
