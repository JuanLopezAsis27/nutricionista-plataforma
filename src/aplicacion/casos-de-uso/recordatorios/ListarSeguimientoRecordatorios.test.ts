import { describe, it, expect, vi } from "vitest";
import { ListarSeguimientoRecordatorios } from "./ListarSeguimientoRecordatorios";
import {
  mockRecordatorioWhatsappRepositorio,
  mockMensajeWhatsappRepositorio,
  mockPacienteRepositorio,
  mockTurnoRepositorio,
  mockProveedorWhatsapp,
  mockReloj,
  recordatorioWhatsappEjemplo,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import type { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";

const AHORA = new Date("2026-08-30T12:00:00Z");

/**
 * El modo va como constante tipada y no como `"API" as ...` en el default:
 * el fix automático del linter borra esa aserción por considerarla redundante
 * y el parámetro vuelve a inferirse como `string`.
 */
type ModoWhatsapp = Awaited<ReturnType<IProveedorWhatsapp["modoActual"]>>;
const CON_API: ModoWhatsapp = "API";
const CON_ENLACE: ModoWhatsapp = "ENLACE";

function entrante(cuando: Date, pacienteId = "pac-1"): MensajeWhatsapp {
  return MensajeWhatsapp.crear(
    {
      pacienteId,
      direccion: "ENTRANTE",
      telefono: "5491155554444",
      cuerpo: "Sí, ahí voy",
    },
    `msj-${cuando.getTime()}`,
    cuando,
  );
}

function saliente(cuando: Date, pacienteId = "pac-1"): MensajeWhatsapp {
  return MensajeWhatsapp.crear(
    {
      pacienteId,
      direccion: "SALIENTE",
      telefono: "5491155554444",
      cuerpo: "Te recuerdo tu turno.",
    },
    `out-${cuando.getTime()}`,
    cuando,
  );
}

function armar({
  enviados = [] as RecordatorioWhatsapp[],
  ultimos = new Map<string, MensajeWhatsapp>(),
  entrantes = new Map<string, MensajeWhatsapp>(),
  pacientes = [pacienteEjemplo()],
  turnos = [turnoEjemplo()],
  modo = CON_API,
} = {}) {
  const listar = vi.fn<IRecordatorioWhatsappRepositorio["listar"]>(
    async () => enviados,
  );
  const ultimosPorPacientes = vi.fn(async () => ultimos);
  const ultimosEntrantesPorPacientes = vi.fn(async () => entrantes);
  const caso = new ListarSeguimientoRecordatorios(
    mockRecordatorioWhatsappRepositorio({ listar }),
    mockMensajeWhatsappRepositorio({
      ultimosPorPacientes,
      ultimosEntrantesPorPacientes,
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(
        async (id) => pacientes.find((p) => p.id === id) ?? null,
      ),
    }),
    mockTurnoRepositorio({
      obtenerPorId: vi.fn(
        async (id) => turnos.find((t) => t.id === id) ?? null,
      ),
    }),
    mockProveedorWhatsapp({
      modoActual: vi.fn(async () => modo),
    }),
    mockReloj(AHORA),
  );
  return { caso, listar, ultimosPorPacientes, ultimosEntrantesPorPacientes };
}

describe("ListarSeguimientoRecordatorios", () => {
  describe("respondió", () => {
    const aviso = recordatorioWhatsappEjemplo({ estado: "ENVIADO" });
    const enviadoEn = aviso.aPrimitivos().creadoEn;

    it("no cuenta como respuesta un mensaje que entró ANTES del aviso", async () => {
      // El bug que este cálculo evita: el paciente escribió por otra cosa la
      // semana pasada, y sin comparar fechas la bandeja diría que contestó el
      // recordatorio. El profesional daría el turno por confirmado y nadie
      // llamaría a ese paciente.
      const previo = new Date(enviadoEn.getTime() - 60 * 60 * 1000);
      const { caso } = armar({
        enviados: [aviso],
        entrantes: new Map([["pac-1", entrante(previo)]]),
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.respondio).toBe(false);
    });

    it("cuenta como respuesta lo que entró después del aviso", async () => {
      const luego = new Date(enviadoEn.getTime() + 60 * 60 * 1000);
      const { caso } = armar({
        enviados: [aviso],
        entrantes: new Map([["pac-1", entrante(luego)]]),
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.respondio).toBe(true);
    });

    it("confía en `respondidoEn` aunque no haya mensaje entrante a mano", async () => {
      // El estado lo escribió el webhook al llegar la respuesta. Si la consulta
      // de mensajes no la trae —quedó fuera de la ventana de historial—, el
      // hecho de que contestó sigue siendo cierto.
      const { caso } = armar({
        enviados: [aviso.registrarEstado("RESPONDIDO", AHORA)],
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.respondio).toBe(true);
    });

    it("marca `confirmo` solo cuando la respuesta se leyó como confirmación", async () => {
      const luego = new Date(enviadoEn.getTime() + 60 * 60 * 1000);
      const { caso } = armar({
        enviados: [aviso.registrarEstado("RESPONDIDO", luego)],
        entrantes: new Map([["pac-1", entrante(luego)]]),
      });

      const [fila] = await caso.ejecutar();

      // Contestar y confirmar no son lo mismo: «¿a qué hora era?» es una
      // respuesta, no una confirmación de asistencia.
      expect(fila!.respondio).toBe(true);
      expect(fila!.confirmo).toBe(false);
    });
  });

  describe("qué entra en la bandeja", () => {
    it("deja afuera los avisos que nunca le llegaron a nadie", async () => {
      // PREPARADO (chat abierto, sin confirmar), FALLIDO y DESCARTADO no son
      // seguimiento: no hay a quién esperarle respuesta.
      const { caso } = armar({
        enviados: [
          recordatorioWhatsappEjemplo({ estado: "PREPARADO" }, "r1"),
          recordatorioWhatsappEjemplo({ estado: "FALLIDO" }, "r2"),
          recordatorioWhatsappEjemplo({ estado: "DESCARTADO" }, "r3"),
        ],
      });

      await expect(caso.ejecutar()).resolves.toEqual([]);
    });

    it("agrupa por paciente y se queda con el aviso más reciente", async () => {
      // `listar` viene del más nuevo al más viejo. Dos avisos del mismo turno
      // se leen en la MISMA conversación: repetir la fila no ayuda a decidir.
      const { caso } = armar({
        enviados: [
          recordatorioWhatsappEjemplo({ estado: "ENTREGADO" }, "nuevo"),
          recordatorioWhatsappEjemplo({ estado: "ENVIADO" }, "viejo"),
        ],
      });

      const filas = await caso.ejecutar();

      expect(filas).toHaveLength(1);
      expect(filas[0]!.recordatorioId).toBe("nuevo");
    });

    it("saltea el aviso de un paciente que ya no está", async () => {
      // La fila necesita el nombre; sin paciente no hay nada que mostrar.
      const { caso } = armar({
        enviados: [recordatorioWhatsappEjemplo({ estado: "ENVIADO" })],
        pacientes: [],
      });

      await expect(caso.ejecutar()).resolves.toEqual([]);
    });

    it("conserva la fila aunque el turno se haya borrado", async () => {
      // Al revés que el paciente: el aviso salió igual, y ocultarlo escondería
      // una respuesta pendiente. La fecha va en null y la pantalla lo dibuja.
      const { caso } = armar({
        enviados: [recordatorioWhatsappEjemplo({ estado: "ENVIADO" })],
        turnos: [],
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.turnoId).toBe("tur-1");
      expect(fila!.fechaTurno).toBeNull();
      expect(fila!.horaTurno).toBeNull();
    });

    it("pide de más al repositorio porque después agrupa", async () => {
      // Si pidiera exactamente `limite`, un paciente con tres avisos comería
      // tres cupos y la bandeja mostraría menos filas de las pedidas.
      const { caso, listar } = armar();

      await caso.ejecutar(10);

      expect(listar.mock.calls[0]![0]).toMatchObject({ limite: 30 });
    });

    it("recorta a `limite` pacientes distintos", async () => {
      const { caso } = armar({
        enviados: Array.from({ length: 5 }, (_, i) =>
          recordatorioWhatsappEjemplo(
            { estado: "ENVIADO", pacienteId: `pac-${i}` },
            `r${i}`,
          ),
        ),
        pacientes: Array.from({ length: 5 }, (_, i) =>
          pacienteEjemplo({}, `pac-${i}`),
        ),
      });

      await expect(caso.ejecutar(2)).resolves.toHaveLength(2);
    });

    it("mira un mes de historial hacia atrás", async () => {
      const { caso, listar } = armar();

      await caso.ejecutar();

      expect(listar.mock.calls[0]![0]?.desde).toEqual(
        new Date("2026-07-31T12:00:00Z"),
      );
    });
  });

  describe("ventana de 24 h de Meta", () => {
    it("está abierta si el paciente escribió hace menos de un día", async () => {
      const { caso } = armar({
        enviados: [recordatorioWhatsappEjemplo({ estado: "ENVIADO" })],
        entrantes: new Map([
          ["pac-1", entrante(new Date(AHORA.getTime() - 23 * 3600 * 1000))],
        ]),
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.ventanaAbierta).toBe(true);
    });

    it("está cerrada pasadas las 24 h", async () => {
      // Es la regla de Meta, no una preferencia: con la ventana cerrada solo
      // se puede mandar una plantilla aprobada. Decir que está abierta llevaría
      // al profesional a escribir texto libre que la API rechaza.
      const { caso } = armar({
        enviados: [recordatorioWhatsappEjemplo({ estado: "ENVIADO" })],
        entrantes: new Map([
          ["pac-1", entrante(new Date(AHORA.getTime() - 25 * 3600 * 1000))],
        ]),
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.ventanaAbierta).toBe(false);
    });

    it("está cerrada si el último mensaje del chat lo mandó el consultorio", async () => {
      // Solo un mensaje ENTRANTE reabre la ventana. El propio recordatorio,
      // que es saliente, no la abre.
      const recien = new Date(AHORA.getTime() - 60 * 1000);
      const { caso } = armar({
        enviados: [recordatorioWhatsappEjemplo({ estado: "ENVIADO" })],
        ultimos: new Map([["pac-1", saliente(recien)]]),
      });

      const [fila] = await caso.ejecutar();

      expect(fila!.ultimoMensaje).toBe("Te recuerdo tu turno.");
      expect(fila!.ventanaAbierta).toBe(false);
    });
  });

  it("sin la API conectada no consulta el chat, pero sigue mostrando el envío", async () => {
    // Con el canal wa.me el mensaje lo manda el profesional desde su teléfono:
    // no hay hilo que leer. El seguimiento del ENVÍO sigue teniendo sentido.
    const { caso, ultimosPorPacientes, ultimosEntrantesPorPacientes } = armar({
      enviados: [recordatorioWhatsappEjemplo({ estado: "ENVIADO" })],
      modo: CON_ENLACE,
    });

    const [fila] = await caso.ejecutar();

    expect(ultimosPorPacientes).not.toHaveBeenCalled();
    expect(ultimosEntrantesPorPacientes).not.toHaveBeenCalled();
    expect(fila!.nombrePaciente).toBe("Ana García");
    expect(fila!.ultimoMensaje).toBeNull();
    expect(fila!.respondio).toBe(false);
    expect(fila!.ventanaAbierta).toBe(false);
  });

  it("no consulta nada si no hay recordatorios en el período", async () => {
    const { caso, ultimosPorPacientes } = armar();

    await expect(caso.ejecutar()).resolves.toEqual([]);
    expect(ultimosPorPacientes).not.toHaveBeenCalled();
  });
});
