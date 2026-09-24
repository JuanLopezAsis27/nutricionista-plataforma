import { describe, it, expect, vi } from "vitest";
import { AtenderBotonWhatsapp } from "./AtenderBotonWhatsapp";
import { EnviarPlantillaWhatsapp } from "./EnviarPlantillaWhatsapp";
import { parametrosDeBotones } from "./plantillaMeta";
import type { ConfirmarAsistenciaTurno } from "../turnos/ConfirmarAsistenciaTurno";
import type { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import type { BotonPlantilla } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockEstablecimientoRepositorio,
  mockMensajeWhatsappRepositorio,
  mockPlantillaWhatsappRepositorio,
  mockProveedorWhatsapp,
  mockEnlaceConfirmacionTurno,
  mockReloj,
  turnoEjemplo,
  pacienteEjemplo,
  plantillaWhatsappEjemplo,
  mockNutricionistaRepositorio,
} from "../_ayudas-test";

/**
 * Los botones de las plantillas de WhatsApp, de punta a punta: qué viaja en
 * cada envío, qué pasa cuando el paciente toca uno y cómo se manda una
 * plantilla desde el chat.
 */

const BOTONES: BotonPlantilla[] = [
  { tipo: "RESPUESTA_RAPIDA", texto: "Confirmo", accion: "CONFIRMAR_TURNO" },
  {
    tipo: "RESPUESTA_RAPIDA",
    texto: "Reprogramar",
    accion: "PEDIR_REPROGRAMACION",
  },
  { tipo: "RESPUESTA_RAPIDA", texto: "Gracias", accion: "NINGUNA" },
  {
    tipo: "URL",
    texto: "Ver web",
    destino: "FIJA",
    url: "https://ejemplo.com",
  },
  {
    tipo: "URL",
    texto: "Confirmar online",
    destino: "CONFIRMACION_TURNO",
    url: null,
  },
];

function plantillaConBotones() {
  return plantillaWhatsappEjemplo({
    claveMeta: "recordatorio_botones",
    cuerpo: "Hola {{paciente}}, te espero el {{fecha}} a las {{hora}}.",
    variablesMeta: ["paciente", "fecha", "hora"],
    botones: BOTONES,
  });
}

describe("parametrosDeBotones", () => {
  it("cada respuesta rápida lleva su acción y el turno; el enlace, el token del turno", () => {
    const parametros = parametrosDeBotones(
      plantillaConBotones(),
      turnoEjemplo({}, "tur-9"),
      mockEnlaceConfirmacionTurno(),
    );

    expect(parametros).toEqual([
      { indice: 0, tipo: "QUICK_REPLY", payload: "CONFIRMAR_TURNO:tur-9" },
      { indice: 1, tipo: "QUICK_REPLY", payload: "PEDIR_REPROGRAMACION:tur-9" },
      { indice: 2, tipo: "QUICK_REPLY", payload: "NINGUNA" },
      // El enlace fijo (índice 3) no necesita nada.
      { indice: 4, tipo: "URL", sufijo: "tur-9" },
    ]);
  });
});

function armarAtender(turno = turnoEjemplo()) {
  const confirmar = {
    ejecutar: vi.fn(async () => ({
      fecha: "01/07/2026",
      hora: "10:00",
      yaEstabaConfirmado: false,
    })),
  };
  const emitir = { ejecutar: vi.fn(async () => true) };
  const caso = new AtenderBotonWhatsapp(
    mockTurnoRepositorio({
      obtenerPorId: vi.fn(async (id: string) =>
        id === turno.id ? turno : null,
      ),
    }),
    confirmar as unknown as ConfirmarAsistenciaTurno,
    emitir as unknown as EmitirNotificacion,
  );
  return { caso, confirmar, emitir };
}

describe("AtenderBotonWhatsapp", () => {
  it("«Confirmar» confirma el turno por el mismo camino que el enlace del email", async () => {
    const { caso, confirmar } = armarAtender();

    const atendido = await caso.ejecutar(pacienteEjemplo(), {
      accion: "CONFIRMAR_TURNO",
      turnoId: "tur-1",
    });

    expect(atendido).toBe(true);
    expect(confirmar.ejecutar).toHaveBeenCalledWith("tur-1");
  });

  it("«Reprogramar» no toca el turno: avisa al profesional en la campana", async () => {
    const { caso, confirmar, emitir } = armarAtender();

    await caso.ejecutar(pacienteEjemplo(), {
      accion: "PEDIR_REPROGRAMACION",
      turnoId: "tur-1",
    });

    expect(confirmar.ejecutar).not.toHaveBeenCalled();
    expect(emitir.ejecutar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "REPROGRAMACION_PEDIDA" }),
    );
  });

  it("no actúa sobre el turno de OTRO paciente aunque el payload lo nombre", async () => {
    const { caso, confirmar } = armarAtender(
      turnoEjemplo({ pacienteId: "pac-otro" }),
    );

    const atendido = await caso.ejecutar(pacienteEjemplo(), {
      accion: "CONFIRMAR_TURNO",
      turnoId: "tur-1",
    });

    expect(atendido).toBe(false);
    expect(confirmar.ejecutar).not.toHaveBeenCalled();
  });

  it("un turno cancelado no se confirma: el toque queda como mensaje", async () => {
    const turno = turnoEjemplo();
    turno.cambiarEstado("CANCELADO");
    const { caso, confirmar } = armarAtender(turno);

    expect(
      await caso.ejecutar(pacienteEjemplo(), {
        accion: "CONFIRMAR_TURNO",
        turnoId: "tur-1",
      }),
    ).toBe(false);
    expect(confirmar.ejecutar).not.toHaveBeenCalled();
  });
});

function armarEnvio(
  opciones: {
    plantilla?: ReturnType<typeof plantillaWhatsappEjemplo>;
    turnos?: ReturnType<typeof turnoEjemplo>[];
  } = {},
) {
  const plantilla = opciones.plantilla ?? plantillaConBotones();
  const mensajes = mockMensajeWhatsappRepositorio();
  const proveedor = mockProveedorWhatsapp({
    modoActual: vi.fn(async () => "API" as const),
    enviarPlantilla: vi.fn(async () => ({
      modo: "API" as const,
      idExterno: "wamid.PL",
    })),
  });
  const caso = new EnviarPlantillaWhatsapp(
    mockPlantillaWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => plantilla),
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ telefono: "1155554444" }),
      ),
    }),
    mockTurnoRepositorio({
      obtenerPorPaciente: vi.fn(async () => opciones.turnos ?? []),
    }),
    mockEstablecimientoRepositorio(),
    mockConfiguracionRepositorio(),
    mensajes,
    proveedor,
    mockEnlaceConfirmacionTurno(),
    // Hoy: 14/07/2026.
    mockReloj(),
    mockNutricionistaRepositorio(),
  );
  return { caso, mensajes, proveedor };
}

describe("EnviarPlantillaWhatsapp (desde el chat)", () => {
  it("la manda con el PRÓXIMO turno del paciente y la deja en el hilo", async () => {
    const pasado = turnoEjemplo({ fecha: new Date("2026-07-01") }, "tur-viejo");
    const proximo = turnoEjemplo({ fecha: new Date("2026-07-20") }, "tur-prox");
    const lejano = turnoEjemplo({ fecha: new Date("2026-08-20") }, "tur-lejos");
    const { caso, mensajes, proveedor } = armarEnvio({
      turnos: [lejano, pasado, proximo],
    });

    await caso.ejecutar("pac-1", "pla-wa-1");

    const envio = vi.mocked(proveedor.enviarPlantilla).mock.calls[0]![0];
    expect(envio.nombrePlantilla).toBe("recordatorio_botones");
    expect(envio.parametros[1]).toBe("20/07/2026");
    expect(envio.botones?.[0]).toEqual({
      indice: 0,
      tipo: "QUICK_REPLY",
      payload: "CONFIRMAR_TURNO:tur-prox",
    });
    const guardado = vi.mocked(mensajes.crear).mock.calls[0]![0].aPrimitivos();
    expect(guardado.direccion).toBe("SALIENTE");
    expect(guardado.idExterno).toBe("wamid.PL");
    expect(guardado.cuerpo).toContain("20/07/2026");
  });

  it("no la manda si usa datos del turno y el paciente no tiene ninguno próximo", async () => {
    const { caso, proveedor } = armarEnvio({ turnos: [] });

    await expect(caso.ejecutar("pac-1", "pla-wa-1")).rejects.toThrow(
      ErrorValidacion,
    );
    expect(proveedor.enviarPlantilla).not.toHaveBeenCalled();
  });

  it("una plantilla que solo nombra al paciente sale sin turno", async () => {
    const saludo = plantillaWhatsappEjemplo({
      claveMeta: "saludo",
      cuerpo: "Hola {{paciente}}, ¿cómo venís con el plan?",
      variablesMeta: ["paciente"],
    });
    const { caso, proveedor } = armarEnvio({ plantilla: saludo, turnos: [] });

    await caso.ejecutar("pac-1", "pla-wa-1");

    const envio = vi.mocked(proveedor.enviarPlantilla).mock.calls[0]![0];
    expect(envio.parametros).toHaveLength(1);
  });

  it("no manda una plantilla que Meta todavía está revisando", async () => {
    const enRevision = plantillaConBotones().registrarAltaEnMeta(
      "meta-1",
      "EN_REVISION",
    );
    const { caso, proveedor } = armarEnvio({
      plantilla: enRevision,
      turnos: [turnoEjemplo({ fecha: new Date("2026-07-20") })],
    });

    await expect(caso.ejecutar("pac-1", "pla-wa-1")).rejects.toThrow(
      /aprobada/,
    );
    expect(proveedor.enviarPlantilla).not.toHaveBeenCalled();
  });
});
