import { describe, it, expect, vi } from "vitest";
import { EnviarBienvenidaAlAlta } from "./EnviarBienvenidaAlAlta";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import {
  mockConfiguracionRepositorio,
  mockPacienteRepositorio,
  mockPlantillaEmailRepositorio,
  mockServicioEmail,
  pacienteEjemplo,
  plantillaEmailEjemplo,
} from "../_ayudas-test";

function armar(configuracion: ConfiguracionConsultorio | null) {
  const pacientes = mockPacienteRepositorio();
  const enviarUno = new EnviarEmailDeBienvenida(
    mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => plantillaEmailEjemplo()),
    }),
    mockServicioEmail(),
    "Lic. Marta",
  );
  const caso = new EnviarBienvenidaAlAlta(
    mockConfiguracionRepositorio({ obtener: vi.fn(async () => configuracion) }),
    pacientes,
    enviarUno,
  );
  return { caso, pacientes };
}

describe("EnviarBienvenidaAlAlta", () => {
  it("manda la bienvenida y marca el envío cuando el interruptor está activo (o no se configuró)", async () => {
    const { caso, pacientes } = armar(null);
    const paciente = pacienteEjemplo();

    await caso.ejecutar({ paciente, contrasena: "Clave-2026" });

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
    });

    expect(pacientes.actualizar).not.toHaveBeenCalled();
  });
});
