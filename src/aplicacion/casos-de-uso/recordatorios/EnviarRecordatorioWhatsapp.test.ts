import { describe, it, expect, vi } from "vitest";
import {
  EnviarRecordatorioWhatsapp,
  type PedidoRecordatorio,
} from "./EnviarRecordatorioWhatsapp";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import {
  mockRecordatorioWhatsappRepositorio,
  mockProveedorWhatsapp,
  turnoEjemplo,
  pacienteEjemplo,
  configuracionEjemplo,
  plantillaWhatsappEjemplo,
  recordatorioWhatsappEjemplo,
} from "../_ayudas-test";

/**
 * Tests del envío de UN recordatorio por WhatsApp.
 *
 * Es el caso de uso sin test más grande que quedaba (286 líneas) y el de mayor
 * consecuencia: manda mensajes reales al teléfono de un paciente. Sus reglas
 * —cuándo se omite, cuándo se reintenta reusando la fila, cuándo se crea una
 * nueva— estaban documentadas en comentarios largos y verificadas por nadie.
 *
 * La regla de fondo, que atraviesa casi todos los tests: **el log registra
 * avisos que SALIERON, no intentos.** Un borrador sin confirmar, uno
 * descartado o uno que el proveedor rechazó no son historia: son el mismo
 * aviso todavía pendiente, y el intento siguiente los pisa.
 */

const AHORA = new Date("2026-07-01T09:00:00.000Z");

function pedidoBase(
  cambios: Partial<PedidoRecordatorio> = {},
): PedidoRecordatorio {
  return {
    turno: turnoEjemplo(),
    paciente: pacienteEjemplo({ telefono: "1155554444" }),
    plantilla: plantillaWhatsappEjemplo(),
    configuracion: configuracionEjemplo(),
    diasAntes: null,
    origen: "MANUAL",
    usuarioId: "user-1",
    existentes: [],
    forzar: false,
    ahora: AHORA,
    horasEntreAvisos: 24,
    ...cambios,
  };
}

describe("EnviarRecordatorioWhatsapp — a quién NO se le manda", () => {
  it("omite el turno cancelado: no tiene sentido recordarlo", async () => {
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );

    // `Turno.crear` siempre nace PENDIENTE y la maquina de estados es la
    // unica puerta: por eso se cancela con `cambiarEstado` y no armando la
    // entidad a mano.
    const turno = turnoEjemplo();
    turno.cambiarEstado("CANCELADO");

    const resultado = await caso.ejecutar(pedidoBase({ turno }));

    expect(resultado.estado).toBe("OMITIDO");
  });

  it("omite el paciente sin teléfono en vez de fallar", async () => {
    // Distinción importante: OMITIDO, no FALLIDO. En un envío masivo un
    // paciente sin teléfono no es un error del sistema, y contarlo como fallo
    // ensuciaría el resumen de la corrida.
    const proveedor = mockProveedorWhatsapp();
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      proveedor,
    );

    const resultado = await caso.ejecutar(
      pedidoBase({ paciente: pacienteEjemplo({ telefono: null }) }),
    );

    expect(resultado.estado).toBe("OMITIDO");
    expect(proveedor.preparar).not.toHaveBeenCalled();
  });

  it("acepta los turnos PENDIENTE y CONFIRMADO", async () => {
    for (const estado of ["PENDIENTE", "CONFIRMADO"] as const) {
      const caso = new EnviarRecordatorioWhatsapp(
        mockRecordatorioWhatsappRepositorio(),
        mockProveedorWhatsapp(),
      );

      const turno = turnoEjemplo();
      if (estado === "CONFIRMADO") turno.cambiarEstado("CONFIRMADO");

      const resultado = await caso.ejecutar(pedidoBase({ turno }));

      expect(resultado.estado, `estado ${estado}`).not.toBe("OMITIDO");
    }
  });
});

describe("EnviarRecordatorioWhatsapp — el antiduplicado", () => {
  /**
   * Un aviso que efectivamente salió, hace `horas` horas.
   *
   * Se construye con `RecordatorioWhatsapp.crear(datos, id, ahora)` y no con la
   * ayuda compartida porque el tercer parametro es el que fija `confirmadoEn`,
   * y `salioEn` lee de ahi. Con el reloj real el margen no se puede probar.
   */
  function avisoQueSalio(horas: number, diasAntes: number | null = null) {
    const salida = new Date(AHORA.getTime() - horas * 60 * 60 * 1000);
    return RecordatorioWhatsapp.crear(
      {
        turnoId: "tur-1",
        pacienteId: "pac-1",
        telefono: "541155554444",
        mensaje: "Recordatorio de turno",
        usuarioId: "user-1",
        origen: "MANUAL",
        diasAntes,
        estado: "ENVIADO",
      },
      `rec-${horas}-${diasAntes ?? "manual"}`,
      salida,
    );
  }

  it("omite si ya salió un aviso dentro del margen configurado", async () => {
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );

    const resultado = await caso.ejecutar(
      pedidoBase({ existentes: [avisoQueSalio(3)], horasEntreAvisos: 24 }),
    );

    expect(resultado.estado).toBe("OMITIDO");
    if (resultado.estado === "OMITIDO") {
      // El motivo dice cuándo se puede reintentar: sin eso, el profesional no
      // sabe si esperar o si algo se rompió.
      expect(resultado.motivo).toContain("24");
    }
  });

  it("deja avisar de nuevo pasado el margen", async () => {
    // El caso real: un turno agendado con tres semanas y reprogramado dos
    // veces necesita más de un aviso. Antes la única salida era tildar
    // "reenviar a todos", que apagaba la protección del lote entero.
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );

    const resultado = await caso.ejecutar(
      pedidoBase({ existentes: [avisoQueSalio(30)], horasEntreAvisos: 24 }),
    );

    expect(resultado.estado).not.toBe("OMITIDO");
  });

  it("`forzar` saltea el margen: la insistencia deliberada no se corta", async () => {
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );

    const resultado = await caso.ejecutar(
      pedidoBase({ existentes: [avisoQueSalio(1)], forzar: true }),
    );

    expect(resultado.estado).not.toBe("OMITIDO");
  });

  it("un aviso FALLIDO no bloquea: no le llegó a nadie", async () => {
    // Lo que bloquea es un aviso que SALIÓ. Un rechazo del proveedor es el
    // mismo aviso sin resolver, no "ya se le avisó".
    const fallido = recordatorioWhatsappEjemplo({}).registrarFallo(
      "Meta rechazó el envío",
    );
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );

    const resultado = await caso.ejecutar(
      pedidoBase({ existentes: [fallido] }),
    );

    expect(resultado.estado).not.toBe("OMITIDO");
  });

  it("reintentar un fallido REUSA la fila en vez de apilar otra", async () => {
    // El bug histórico: preparar → descartar → preparar → descartar apilaba
    // una fila por clic. Y para los escalones programados no es prolijidad
    // sino necesidad: el índice único (turno, diasAntes) no deja insertar dos.
    const fallido = recordatorioWhatsappEjemplo({}).registrarFallo("rechazo");
    const repositorio = mockRecordatorioWhatsappRepositorio();
    const caso = new EnviarRecordatorioWhatsapp(
      repositorio,
      mockProveedorWhatsapp(),
    );

    await caso.ejecutar(pedidoBase({ existentes: [fallido] }));

    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    expect(repositorio.registrar).not.toHaveBeenCalled();
  });

  it("un escalón programado reusa su fila incluso si ya se envió", async () => {
    const enviado = avisoQueSalio(48, 3);
    const repositorio = mockRecordatorioWhatsappRepositorio();
    const caso = new EnviarRecordatorioWhatsapp(
      repositorio,
      mockProveedorWhatsapp(),
    );

    await caso.ejecutar(
      pedidoBase({ diasAntes: 3, existentes: [enviado], origen: "AUTOMATICO" }),
    );

    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    expect(repositorio.registrar).not.toHaveBeenCalled();
  });

  it("un reenvío MANUAL sobre un aviso que salió crea fila nueva", async () => {
    // Acá la insistencia es real y pisar la fila anterior convertiría
    // "le mandé el lunes y volví a insistir el jueves" en "le mandé el jueves".
    const repositorio = mockRecordatorioWhatsappRepositorio();
    const caso = new EnviarRecordatorioWhatsapp(
      repositorio,
      mockProveedorWhatsapp(),
    );

    await caso.ejecutar(
      pedidoBase({
        diasAntes: null,
        existentes: [avisoQueSalio(48)],
        forzar: true,
      }),
    );

    expect(repositorio.registrar).toHaveBeenCalledTimes(1);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("un envío manual no pisa el aviso automático programado", async () => {
    // `recordatorioPrevio` filtra por diasAntes null cuando el envío es
    // manual: sin ese filtro, avisar a mano hoy sobrescribiría el aviso
    // automático que tiene que salir mañana.
    const programado = recordatorioWhatsappEjemplo(
      { diasAntes: 1 },
      "rec-prog",
    );
    const repositorio = mockRecordatorioWhatsappRepositorio();
    const caso = new EnviarRecordatorioWhatsapp(
      repositorio,
      mockProveedorWhatsapp(),
    );

    await caso.ejecutar(
      pedidoBase({ diasAntes: null, existentes: [programado] }),
    );

    expect(repositorio.registrar).toHaveBeenCalledTimes(1);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});

describe("EnviarRecordatorioWhatsapp — cómo sale el mensaje", () => {
  it("por API queda ENVIADO; por enlace queda PREPARADO", async () => {
    // La diferencia importa: con el enlace el mensaje todavía no salió, sale
    // cuando el profesional abre el chat. Marcarlo ENVIADO ahí sería mentir.
    const porApi = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp({
        preparar: vi.fn(async () => ({
          modo: "API" as const,
          idExterno: "wamid.123",
        })),
      }),
    );
    expect((await porApi.ejecutar(pedidoBase())).estado).toBe("ENVIADO");

    const porEnlace = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );
    const resultado = await porEnlace.ejecutar(pedidoBase());
    expect(resultado.estado).toBe("PREPARADO");
    if (resultado.estado === "PREPARADO") {
      expect(resultado.enlace).toContain("wa.me");
    }
  });

  it("usa la plantilla de Meta cuando la plantilla tiene clave", async () => {
    const proveedor = mockProveedorWhatsapp();
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      proveedor,
    );

    await caso.ejecutar(
      pedidoBase({
        plantilla: plantillaWhatsappEjemplo({ claveMeta: "recordatorio_24h" }),
      }),
    );

    expect(proveedor.enviarPlantilla).toHaveBeenCalledTimes(1);
    expect(proveedor.preparar).not.toHaveBeenCalled();
  });

  it("un texto editado a mano NO se manda como plantilla de Meta", async () => {
    // Regla sutil y de consecuencia visible: un cuerpo editado ya no coincide
    // con el que Meta aprobó. Mandarlo bajo ese nombre haría que el paciente
    // leyera el texto APROBADO en lugar del que el profesional acaba de
    // escribir.
    const proveedor = mockProveedorWhatsapp();
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      proveedor,
    );

    await caso.ejecutar(
      pedidoBase({
        plantilla: plantillaWhatsappEjemplo({ claveMeta: "recordatorio_24h" }),
        textoManual: "Ana, te espero mañana a las 10. Traé los análisis.",
      }),
    );

    expect(proveedor.enviarPlantilla).not.toHaveBeenCalled();
    expect(proveedor.preparar).toHaveBeenCalledTimes(1);
    const [mensaje] = (proveedor.preparar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [{ texto: string }];
    expect(mensaje.texto).toBe(
      "Ana, te espero mañana a las 10. Traé los análisis.",
    );
  });

  it("un texto manual en blanco cae de vuelta en la plantilla", async () => {
    const proveedor = mockProveedorWhatsapp();
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      proveedor,
    );

    await caso.ejecutar(pedidoBase({ textoManual: "   " }));

    const [mensaje] = (proveedor.preparar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [{ texto: string }];
    expect(mensaje.texto.trim()).not.toBe("");
  });
});

describe("EnviarRecordatorioWhatsapp — cuando el proveedor falla", () => {
  const proveedorQueFalla = () =>
    mockProveedorWhatsapp({
      preparar: vi.fn(async () => {
        throw new Error("Meta: número no válido");
      }),
    });

  it("devuelve FALLIDO con el motivo del proveedor", async () => {
    const caso = new EnviarRecordatorioWhatsapp(
      mockRecordatorioWhatsappRepositorio(),
      proveedorQueFalla(),
    );

    const resultado = await caso.ejecutar(pedidoBase());

    expect(resultado.estado).toBe("FALLIDO");
    if (resultado.estado === "FALLIDO") {
      expect(resultado.motivo).toContain("número no válido");
    }
  });

  it("deja el fallo registrado, para poder ver a quién NO le llegó", async () => {
    const repositorio = mockRecordatorioWhatsappRepositorio();
    const caso = new EnviarRecordatorioWhatsapp(
      repositorio,
      proveedorQueFalla(),
    );

    await caso.ejecutar(pedidoBase());

    expect(repositorio.registrar).toHaveBeenCalledTimes(1);
    const [guardado] = (repositorio.registrar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [RecordatorioWhatsapp];
    expect(guardado.aPrimitivos().estado).toBe("FALLIDO");
    expect(guardado.aPrimitivos().error).toContain("número no válido");
  });

  it("al fallar sobre una fila previa la reusa en vez de duplicar", async () => {
    const previo = recordatorioWhatsappEjemplo({ diasAntes: 3 });
    const repositorio = mockRecordatorioWhatsappRepositorio();
    const caso = new EnviarRecordatorioWhatsapp(
      repositorio,
      proveedorQueFalla(),
    );

    await caso.ejecutar(pedidoBase({ diasAntes: 3, existentes: [previo] }));

    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    expect(repositorio.registrar).not.toHaveBeenCalled();
  });
});
