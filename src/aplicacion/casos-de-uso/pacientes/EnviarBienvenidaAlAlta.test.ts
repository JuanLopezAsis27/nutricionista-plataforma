import { describe, it, expect, vi } from "vitest";
import { EnviarBienvenidaAlAlta } from "./EnviarBienvenidaAlAlta";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import {
  mockConfiguracionRepositorio,
  mockPacienteRepositorio,
  mockPlantillaEmailRepositorio,
  mockServicioEmail,
  pacienteEjemplo,
  plantillaEmailEjemplo,
  mockNutricionistaConNombre,
  mockNotificacionRepositorio,
  mockReloj,
} from "../_ayudas-test";

function armar(
  configuracion: ConfiguracionConsultorio | null,
  opciones: {
    dominioRecibe?: boolean | null;
    enviar?: IServicioEmail["enviar"];
  } = {},
) {
  const pacientes = mockPacienteRepositorio();
  const enviar = opciones.enviar ?? vi.fn(async () => {});
  const enviarUno = new EnviarEmailDeBienvenida(
    mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => plantillaEmailEjemplo()),
    }),
    mockServicioEmail({ enviar }),
    mockNutricionistaConNombre("Lic. Marta"),
  );
  const notificaciones = mockNotificacionRepositorio();
  const caso = new EnviarBienvenidaAlAlta(
    mockConfiguracionRepositorio({ obtener: vi.fn(async () => configuracion) }),
    pacientes,
    enviarUno,
    {
      recibeCorreo: vi.fn(async () =>
        opciones.dominioRecibe === undefined ? true : opciones.dominioRecibe,
      ),
    },
    new EmitirNotificacion(notificaciones, mockReloj()),
  );
  const avisos = () =>
    vi.mocked(notificaciones.crear).mock.calls.map(([n]) => n.aPrimitivos());
  return { caso, pacientes, enviar, avisos };
}

describe("EnviarBienvenidaAlAlta", () => {
  it("manda la bienvenida y marca el envío cuando el interruptor está activo (o no se configuró)", async () => {
    const { caso, pacientes } = armar(null);
    const paciente = pacienteEjemplo();

    await caso.ejecutar({
      paciente,
      contrasena: "Clave-2026",
      usuario: "ana@mail.com",
    });

    expect(pacientes.actualizar).toHaveBeenCalledOnce();
    const [pacienteActualizado] = (
      pacientes.actualizar as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [{ bienvenidaEnviadaEn: Date | null }];
    expect(pacienteActualizado.bienvenidaEnviadaEn).not.toBeNull();
  });

  it("no manda nada si el consultorio apagó la bienvenida automática", async () => {
    const configApagada = ConfiguracionConsultorio.porDefecto().actualizar({
      bienvenidaAutomaticaActiva: false,
    });
    const { caso, pacientes } = armar(configApagada);

    await caso.ejecutar({
      paciente: pacienteEjemplo(),
      contrasena: "Clave-2026",
      usuario: "ana@mail.com",
    });

    expect(pacientes.actualizar).not.toHaveBeenCalled();
  });

  it("si el dominio no recibe correo, no manda y avisa al profesional", async () => {
    const { caso, pacientes, enviar, avisos } = armar(null, {
      dominioRecibe: false,
    });
    const paciente = pacienteEjemplo({ email: "ana@gmial.com" });

    await caso.ejecutar({
      paciente,
      contrasena: "Clave-2026",
      usuario: "ana@mail.com",
    });

    expect(enviar).not.toHaveBeenCalled();
    expect(pacientes.actualizar).not.toHaveBeenCalled();
    const [aviso] = avisos();
    expect(aviso).toMatchObject({
      tipo: "BIENVENIDA_FALLIDA",
      pacienteId: paciente.id,
      enlace: `/dashboard/pacientes/${paciente.id}`,
    });
    expect(aviso!.detalle).toContain("gmial.com");
  });

  it("si el servidor de correo lo rechaza, avisa con el motivo y no lanza", async () => {
    const { caso, pacientes, avisos } = armar(null, {
      enviar: vi.fn(async () => {
        throw new Error("550 5.1.1 User unknown");
      }),
    });

    await expect(
      caso.ejecutar({
        paciente: pacienteEjemplo(),
        contrasena: "Clave-2026",
        usuario: "ana@mail.com",
      }),
    ).resolves.toBeUndefined();

    expect(pacientes.actualizar).not.toHaveBeenCalled();
    const [aviso] = avisos();
    expect(aviso!.tipo).toBe("BIENVENIDA_FALLIDA");
    expect(aviso!.detalle).toContain("550 5.1.1 User unknown");
  });

  it("sin email en la ficha no manda nada ni avisa: los datos se dan en mano", async () => {
    const { caso, enviar, avisos } = armar(null);

    await caso.ejecutar({
      paciente: pacienteEjemplo({ email: null }),
      contrasena: "Clave-2026",
      usuario: "juan.perez",
    });

    expect(enviar).not.toHaveBeenCalled();
    expect(avisos()).toHaveLength(0);
  });

  it("el email lleva con qué entra la cuenta, aunque no sea el email de contacto", async () => {
    const { caso, enviar } = armar(null);

    await caso.ejecutar({
      paciente: pacienteEjemplo({ email: "mama@mail.com" }),
      contrasena: "Clave-2026",
      usuario: "sofi.perez",
    });

    const [mensaje] = vi.mocked(enviar).mock.calls[0]!;
    expect(mensaje.para).toBe("mama@mail.com");
  });

  it("si no se pudo consultar el DNS, manda igual (no inventa que no existe)", async () => {
    const { caso, enviar, avisos } = armar(null, { dominioRecibe: null });

    await caso.ejecutar({
      paciente: pacienteEjemplo(),
      contrasena: "Clave-2026",
      usuario: "ana@mail.com",
    });

    expect(enviar).toHaveBeenCalledOnce();
    expect(avisos()).toHaveLength(0);
  });
});
