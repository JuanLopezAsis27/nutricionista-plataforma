import { describe, it, expect, vi } from "vitest";
import { EnviarMensaje } from "./EnviarMensaje";
import { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import { Notificacion } from "@/dominio/entidades/Notificacion";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockMensajeriaRepositorio,
  mockUsuarioRepositorio,
  mockBusEventos,
  mockPacienteRepositorio,
  mockNotificacionRepositorio,
  mockReloj,
  conversacionEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const usuarioNutri = Usuario.reconstruir({
  id: "usr-nutri",
  email: "nutri@demo.com",
  nombreUsuario: null,
  passwordHash: "x",
  rol: "NUTRICIONISTA",
  nutricionistaId: "usr-nutri",
  activo: true,
  passwordProvisional: false,
  fotoPerfilId: null,
  creadoEn: new Date(),
});
const usuarioPaciente = Usuario.reconstruir({
  id: "usr-pac",
  email: "pac@demo.com",
  nombreUsuario: null,
  passwordHash: "x",
  rol: "PACIENTE",
  nutricionistaId: null,
  activo: true,
  passwordProvisional: false,
  fotoPerfilId: null,
  creadoEn: new Date(),
});

/**
 * Los dos argumentos del aviso persistido. Estos tests miran el mensaje y el
 * evento de tiempo real; que el aviso quede en la campana lo cubren los tests
 * de más abajo y los de `EmitirNotificacion`.
 */
function avisos(): [IPacienteRepositorio, EmitirNotificacion] {
  return [
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    }),
    new EmitirNotificacion(mockNotificacionRepositorio(), mockReloj()),
  ];
}

describe("EnviarMensaje", () => {
  it("del paciente: crea la conversación si no existe y notifica al nutricionista", async () => {
    const crearConversacion = vi.fn(async () => conversacionEjemplo());
    const repo = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => null),
      crearConversacion,
    });
    const usuarios = mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioNutri]),
    });
    const publicar = vi.fn(async () => {});
    const bus = mockBusEventos({ publicar });

    const mensaje = await new EnviarMensaje(
      repo,
      usuarios,
      bus,
      ...avisos(),
    ).ejecutar({
      autorId: "usr-pac",
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "Hola, tengo una duda",
    });

    expect(crearConversacion).toHaveBeenCalledOnce();
    expect(mensaje.cuerpo).toBe("Hola, tengo una duda");
    expect(publicar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "mensaje.nuevo",
        usuarioId: "usr-nutri",
      }),
    );
  });

  it("del nutricionista: reutiliza la conversación y notifica al paciente", async () => {
    const crearConversacion = vi.fn();
    const repo = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => conversacionEjemplo()),
      crearConversacion,
    });
    const usuarios = mockUsuarioRepositorio({
      obtenerPorPacienteId: vi.fn(async () => usuarioPaciente),
    });
    const publicar = vi.fn(async () => {});

    await new EnviarMensaje(
      repo,
      usuarios,
      mockBusEventos({ publicar }),
      ...avisos(),
    ).ejecutar({
      autorId: "usr-nutri",
      autorEsNutricionista: true,
      pacienteId: "pac-1",
      cuerpo: "Todo bien, seguí así",
    });

    expect(crearConversacion).not.toHaveBeenCalled();
    expect(publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "mensaje.nuevo", usuarioId: "usr-pac" }),
    );
  });

  it("no notifica al propio autor (nutri escribiéndose a sí mismo no aplica)", async () => {
    const repo = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => conversacionEjemplo()),
    });
    const usuarios = mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioNutri]),
    });
    const publicar = vi.fn(async () => {});

    await new EnviarMensaje(
      repo,
      usuarios,
      mockBusEventos({ publicar }),
      ...avisos(),
    ).ejecutar({
      autorId: "usr-nutri", // el autor está entre los nutris
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "test",
    });

    expect(publicar).not.toHaveBeenCalled();
  });

  it("rechaza un mensaje vacío", async () => {
    await expect(
      new EnviarMensaje(
        mockMensajeriaRepositorio({
          obtenerConversacionPorPaciente: vi.fn(async () =>
            conversacionEjemplo(),
          ),
        }),
        mockUsuarioRepositorio(),
        mockBusEventos(),
        ...avisos(),
      ).ejecutar({
        autorId: "usr-pac",
        autorEsNutricionista: false,
        pacienteId: "pac-1",
        cuerpo: "   ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("EnviarMensaje — el aviso que queda en la campana", () => {
  function armar() {
    const notificaciones = mockNotificacionRepositorio();
    const uc = new EnviarMensaje(
      mockMensajeriaRepositorio({
        obtenerConversacionPorPaciente: vi.fn(async () =>
          conversacionEjemplo(),
        ),
      }),
      mockUsuarioRepositorio({
        listarPorRol: vi.fn(async () => [usuarioNutri]),
        obtenerPorPacienteId: vi.fn(async () => usuarioNutri),
      }),
      mockBusEventos(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      new EmitirNotificacion(notificaciones, mockReloj()),
    );
    return { uc, notificaciones };
  }

  it("cuando escribe el PACIENTE deja una notificación persistida", async () => {
    // El evento del bus solo llega a quien tenga la app abierta; esto es lo que
    // sigue estando a la mañana siguiente y se puede marcar como visto.
    const { uc, notificaciones } = armar();

    await uc.ejecutar({
      autorId: "usr-pac",
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "Hola, una consulta sobre el plan",
    });

    expect(notificaciones.crear).toHaveBeenCalledTimes(1);
    const [creada] = (notificaciones.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Notificacion];
    expect(creada.tipo).toBe("MENSAJE_APP");
    expect(creada.detalle).toContain("consulta sobre el plan");
    expect(creada.enlace).toContain("/dashboard/mensajes");
    // Nace sin ver: es lo que la hace contar en el globo.
    expect(creada.vistoEn).toBeNull();
  });

  it("cuando escribe el NUTRICIONISTA no se notifica a sí mismo", async () => {
    const { uc, notificaciones } = armar();

    await uc.ejecutar({
      autorId: "usr-nutri",
      autorEsNutricionista: true,
      pacienteId: "pac-1",
      cuerpo: "Te mando el plan",
    });

    expect(notificaciones.crear).not.toHaveBeenCalled();
  });

  it("varios mensajes seguidos dejan UN solo aviso, con el último texto", async () => {
    // Sin agrupar, un paciente que escribe cinco veces llenaba la campana de
    // líneas idénticas. El contador de no leídos que esto reemplaza mostraba
    // una sola fila por conversación.
    const pendiente = Notificacion.crear(
      {
        tipo: "MENSAJE_APP",
        titulo: "Ana García te escribió",
        detalle: "el primero",
        pacienteId: "pac-1",
        enlace: "/dashboard/mensajes?paciente=pac-1",
      },
      "not-1",
    );
    const notificaciones = mockNotificacionRepositorio({
      obtenerNoVistaDe: vi.fn(async () => pendiente),
    });
    const uc = new EnviarMensaje(
      mockMensajeriaRepositorio({
        obtenerConversacionPorPaciente: vi.fn(async () =>
          conversacionEjemplo(),
        ),
      }),
      mockUsuarioRepositorio({
        listarPorRol: vi.fn(async () => [usuarioNutri]),
      }),
      mockBusEventos(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      new EmitirNotificacion(notificaciones, mockReloj()),
    );

    await uc.ejecutar({
      autorId: "usr-pac",
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "el segundo",
    });

    expect(notificaciones.crear).not.toHaveBeenCalled();
    expect(notificaciones.actualizar).toHaveBeenCalledTimes(1);
    const [refrescada] = (notificaciones.actualizar as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [Notificacion];
    expect(refrescada.detalle).toBe("el segundo");
  });

  it("si el aviso anterior YA se vio, el mensaje nuevo abre otro", async () => {
    // Una vez visto, el aviso es historia: pisarlo borraría el registro de que
    // ya se había atendido.
    const vista = Notificacion.reconstruir({
      id: "not-1",
      tipo: "MENSAJE_APP",
      titulo: "Ana García te escribió",
      detalle: "el viejo",
      pacienteId: "pac-1",
      enlace: null,
      vistoEn: new Date("2026-07-14T10:00:00Z"),
      creadoEn: new Date("2026-07-14T09:00:00Z"),
    });
    const notificaciones = mockNotificacionRepositorio({
      // El repositorio solo devuelve las NO vistas, así que acá no hay
      // pendiente aunque exista una vieja ya vista.
      obtenerNoVistaDe: vi.fn(async () => null),
    });
    const uc = new EnviarMensaje(
      mockMensajeriaRepositorio({
        obtenerConversacionPorPaciente: vi.fn(async () =>
          conversacionEjemplo(),
        ),
      }),
      mockUsuarioRepositorio({
        listarPorRol: vi.fn(async () => [usuarioNutri]),
      }),
      mockBusEventos(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      new EmitirNotificacion(notificaciones, mockReloj()),
    );

    await uc.ejecutar({
      autorId: "usr-pac",
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "el nuevo",
    });

    expect(vista.estaVista).toBe(true);
    expect(notificaciones.crear).toHaveBeenCalledTimes(1);
    expect(notificaciones.actualizar).not.toHaveBeenCalled();
  });

  it("si el aviso falla, el mensaje se manda igual", async () => {
    // El mensaje ya está guardado y el paciente no tiene nada que ver con que
    // la campana funcione.
    const notificaciones = mockNotificacionRepositorio({
      crear: vi.fn(async () => {
        throw new Error("base caída");
      }),
    });
    const uc = new EnviarMensaje(
      mockMensajeriaRepositorio({
        obtenerConversacionPorPaciente: vi.fn(async () =>
          conversacionEjemplo(),
        ),
      }),
      mockUsuarioRepositorio({
        listarPorRol: vi.fn(async () => [usuarioNutri]),
      }),
      mockBusEventos(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      new EmitirNotificacion(notificaciones, mockReloj()),
    );

    const mensaje = await uc.ejecutar({
      autorId: "usr-pac",
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "hola",
    });

    expect(mensaje.cuerpo).toBe("hola");
  });
});
