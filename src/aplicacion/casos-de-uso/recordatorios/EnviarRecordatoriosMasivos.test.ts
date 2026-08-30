import { describe, it, expect, vi } from "vitest";
import { EnviarRecordatoriosMasivos } from "./EnviarRecordatoriosMasivos";
import { EnviarRecordatorioWhatsapp } from "./EnviarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockPlantillaWhatsappRepositorio,
  mockConfiguracionRecordatoriosRepositorio,
  mockRecordatorioWhatsappRepositorio,
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

function armar(
  opciones: {
    turnos?: Record<string, ReturnType<typeof turnoEjemplo> | null>;
    paciente?: ReturnType<typeof pacienteEjemplo> | null;
    existentes?: Map<string, RecordatorioWhatsapp[]>;
    plantilla?: ReturnType<typeof plantillaWhatsappEjemplo> | null;
    whatsappActivo?: boolean;
    emailActivo?: boolean;
  } = {},
) {
  const turnos = opciones.turnos ?? { "tur-1": turnoEjemplo({}, "tur-1") };
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
  const recordatorios = mockRecordatorioWhatsappRepositorio({
    porTurnos: vi.fn(async () => opciones.existentes ?? new Map()),
  });
  const proveedor = mockProveedorWhatsapp();
  const caso = new EnviarRecordatoriosMasivos(
    mockTurnoRepositorio({
      obtenerPorId: vi.fn(async (id: string) => turnos[id] ?? null),
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        opciones.paciente === undefined
          ? pacienteEjemplo({ telefono: "011 15 5555-4444" })
          : opciones.paciente,
      ),
    }),
    mockConfiguracionRepositorio(),
    mockPlantillaWhatsappRepositorio({
      obtenerPredeterminada: vi.fn(async () =>
        opciones.plantilla === undefined
          ? plantillaWhatsappEjemplo()
          : opciones.plantilla,
      ),
    }),
    mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(async () =>
        configuracionRecordatoriosEjemplo({
          whatsappActivo: opciones.whatsappActivo ?? true,
          emailActivo: opciones.emailActivo ?? true,
        }),
      ),
    }),
    recordatorios,
    new EnviarRecordatorioWhatsapp(recordatorios, proveedor),
    emailPorTurno,
  );
  return { caso, recordatorios, proveedor, enviarEmail };
}

function avisoPrevio(turnoId: string): RecordatorioWhatsapp {
  return RecordatorioWhatsapp.crear(
    {
      turnoId,
      pacienteId: "pac-1",
      telefono: "5491155554444",
      mensaje: "Ya te avisé",
      usuarioId: "usr-1",
      estado: "ENVIADO",
    },
    "rec-previo",
  );
}

describe("EnviarRecordatoriosMasivos", () => {
  it("manda a los turnos seleccionados y devuelve el detalle uno por uno", async () => {
    const { caso } = armar({
      turnos: {
        "tur-1": turnoEjemplo({}, "tur-1"),
        "tur-2": turnoEjemplo({ hora: "11:00" }, "tur-2"),
      },
    });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1", "tur-2"],
      usuarioId: "usr-1",
    });

    // Sin API conectada quedan PREPARADOS: cada uno es un chat que el
    // profesional abre a mano, y por eso la UI necesita los enlaces sueltos.
    expect(resultado.preparados).toBe(2);
    expect(resultado.detalles).toHaveLength(2);
    expect(resultado.detalles[0]!.enlace).toContain("5491155554444");
  });

  // La protección pedida: seleccionar de más no le manda dos veces al mismo.
  it("omite por defecto a quien ya recibió el aviso de ese turno", async () => {
    const { caso, recordatorios } = armar({
      existentes: new Map([["tur-1", [avisoPrevio("tur-1")]]]),
    });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(resultado).toMatchObject({
      omitidos: 1,
      enviados: 0,
      preparados: 0,
    });
    // El motivo dice CUÁNDO se puede volver a avisar: "ya se le avisó" a secas
    // dejaba al profesional sin saber si el bloqueo era temporal o definitivo.
    expect(resultado.detalles[0]!.motivo).toContain("Ya se le avisó");
    expect(recordatorios.registrar).not.toHaveBeenCalled();
  });

  // Insistir a propósito tiene que seguir siendo posible: lo que se corta es
  // el duplicado por error, no la insistencia deliberada.
  it("con forzar manda igual aunque ya se le haya avisado", async () => {
    const { caso, recordatorios } = armar({
      existentes: new Map([["tur-1", [avisoPrevio("tur-1")]]]),
    });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
      forzar: true,
    });

    expect(resultado.preparados).toBe(1);
    expect(recordatorios.registrar).toHaveBeenCalledTimes(1);
  });

  // El bug que llenaba el turno de avisos: con el enlace wa.me, "mandar" es
  // abrir el chat, y la app no sabe si el mensaje salió hasta que el
  // profesional lo confirma. Apretar de nuevo sobre uno sin confirmar es
  // REABRIR ese chat, no mandar otro aviso.
  it("reusa el borrador sin confirmar en vez de apilar avisos", async () => {
    const borrador = RecordatorioWhatsapp.crear(
      {
        turnoId: "tur-1",
        pacienteId: "pac-1",
        telefono: "5491155554444",
        mensaje: "Chat abierto, sin confirmar",
        usuarioId: "usr-1",
      },
      "rec-borrador",
    );
    const { caso, recordatorios } = armar({
      existentes: new Map([["tur-1", [borrador]]]),
    });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(resultado.preparados).toBe(1);
    expect(recordatorios.registrar).not.toHaveBeenCalled();
    const [reusado] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(reusado.id).toBe("rec-borrador");
    expect(reusado.estado).toBe("PREPARADO");
  });

  // Lo que el profesional reportó: tildaba pacientes, apretaba Enviar, y el
  // email no salía. Un envío manual manda por los medios ACTIVOS, no solo por
  // WhatsApp.
  it("manda también el email a cada paciente del lote", async () => {
    const { caso, enviarEmail } = armar({
      turnos: {
        "tur-1": turnoEjemplo({}, "tur-1"),
        "tur-2": turnoEjemplo({ hora: "11:00" }, "tur-2"),
      },
    });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1", "tur-2"],
      usuarioId: "usr-1",
    });

    expect(enviarEmail).toHaveBeenCalledTimes(2);
    expect(resultado.emailsEnviados).toBe(2);
  });

  it("omite al paciente sin teléfono en vez de cortar el lote", async () => {
    const { caso } = armar({ paciente: pacienteEjemplo({ telefono: null }) });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(resultado.omitidos).toBe(1);
    expect(resultado.detalles[0]!.motivo).toContain("teléfono");
  });

  it("registra el fallo del proveedor sin frenar el resto del lote", async () => {
    const { caso, recordatorios, proveedor } = armar({
      turnos: {
        "tur-1": turnoEjemplo({}, "tur-1"),
        "tur-2": turnoEjemplo({ hora: "11:00" }, "tur-2"),
      },
    });
    vi.mocked(proveedor.preparar)
      .mockRejectedValueOnce(new Error("Fuera de la ventana de 24 h"))
      .mockResolvedValueOnce({ modo: "ENLACE", enlace: "https://wa.me/549" });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1", "tur-2"],
      usuarioId: "usr-1",
    });

    expect(resultado).toMatchObject({ fallidos: 1, preparados: 1 });
    // El fallo se persiste: el profesional tiene que poder ver a quién NO le
    // llegó, y esa fila es la que el reintento va a reusar.
    const fallido = vi
      .mocked(recordatorios.registrar)
      .mock.calls.map(([r]) => r.aPrimitivos())
      .find((r) => r.estado === "FALLIDO");
    expect(fallido?.error).toContain("ventana de 24 h");
  });

  // Apagar un medio no puede dejar al paciente sin ningún aviso: el otro sale.
  it("con WhatsApp desactivado manda igual por email", async () => {
    const { caso, recordatorios, enviarEmail } = armar({
      whatsappActivo: false,
    });

    const resultado = await caso.ejecutar({
      turnoIds: ["tur-1"],
      usuarioId: "usr-1",
    });

    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(resultado.emailsEnviados).toBe(1);
    expect(recordatorios.registrar).not.toHaveBeenCalled();
  });

  it("no manda nada si están los dos medios desactivados", async () => {
    const { caso } = armar({ whatsappActivo: false, emailActivo: false });

    await expect(
      caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" }),
    ).rejects.toThrow(ErrorValidacion);
  });

  it("falla si no hay plantilla predeterminada", async () => {
    const { caso } = armar({ plantilla: null });

    await expect(
      caso.ejecutar({ turnoIds: ["tur-1"], usuarioId: "usr-1" }),
    ).rejects.toThrow(ErrorPlantillaWhatsappNoEncontrada);
  });

  it("rechaza un lote vacío", async () => {
    const { caso } = armar();

    await expect(
      caso.ejecutar({ turnoIds: [], usuarioId: "usr-1" }),
    ).rejects.toThrow(ErrorValidacion);
  });
});
