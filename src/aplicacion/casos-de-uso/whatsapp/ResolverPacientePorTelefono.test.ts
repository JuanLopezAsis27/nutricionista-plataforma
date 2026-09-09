import { describe, it, expect, vi } from "vitest";
import { ResolverPacientePorTelefono } from "./ResolverPacientePorTelefono";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import {
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

/**
 * Tests del filtro del que depende toda la ingesta de WhatsApp.
 *
 * POR QUÉ IMPORTA MÁS QUE UN CASO DE USO CUALQUIERA: el número del consultorio
 * suele ser el WhatsApp personal del profesional. Este caso de uso es lo único
 * que impide que los mensajes de su familia y sus amigos entren a la base del
 * consultorio. Si devolviera un paciente de más, se persistiría conversación
 * privada ajena a la app; si devolviera null de más, se perderían mensajes de
 * pacientes reales.
 *
 * El punto fino es la NORMALIZACIÓN: `Paciente.telefono` es texto libre —el
 * mismo número puede estar cargado como "011 15 5555-4444"— y Meta lo entrega
 * como "5491155554444". La comparación va contra el E.164 canónico.
 */

describe("ResolverPacientePorTelefono", () => {
  function armar(pacienteEncontrado = pacienteEjemplo()) {
    const pacientes = mockPacienteRepositorio({
      obtenerPorTelefonoE164: vi.fn(async () => pacienteEncontrado),
    });
    const configuracion = mockConfiguracionRepositorio({
      obtener: vi.fn(async () => ConfiguracionConsultorio.porDefecto()),
    });
    return {
      caso: new ResolverPacientePorTelefono(pacientes, configuracion),
      pacientes,
      configuracion,
    };
  }

  it("busca por el E.164 canónico, no por el texto que llegó", async () => {
    const { caso, pacientes } = armar();

    await caso.ejecutar("011 15 5555-4444");

    // Lo que llega a la consulta es la forma normalizada: si se buscara el
    // texto crudo, un paciente cargado con otro formato nunca aparecería.
    const [buscado] = (
      pacientes.obtenerPorTelefonoE164 as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string];
    expect(buscado).not.toContain(" ");
    expect(buscado).not.toContain("-");
    expect(buscado).toMatch(/^\d+$/);
  });

  it("resuelve el mismo paciente escriban el número como lo escriban", async () => {
    // El corazón del caso de uso: cuatro grafías del mismo número tienen que
    // producir exactamente la misma búsqueda.
    const formas = [
      "011 15 5555-4444",
      "+54 9 11 5555 4444",
      "5491155554444",
      "11 5555 4444",
    ];
    const buscados: string[] = [];

    for (const forma of formas) {
      const { caso, pacientes } = armar();
      await caso.ejecutar(forma);
      const [buscado] = (
        pacientes.obtenerPorTelefonoE164 as ReturnType<typeof vi.fn>
      ).mock.calls[0] as [string];
      buscados.push(buscado);
    }

    expect(
      new Set(buscados).size,
      `formas normalizadas: ${buscados.join(" | ")}`,
    ).toBe(1);
  });

  it("devuelve null ante un teléfono ilegible, sin propagar el error", async () => {
    // Un número basura en un webhook no puede tumbar la ingesta entera: se
    // descarta ese mensaje y el resto del lote sigue.
    const { caso, pacientes } = armar();

    const resultado = await caso.ejecutar("no-es-un-telefono");

    expect(resultado).toBeNull();
    expect(pacientes.obtenerPorTelefonoE164).not.toHaveBeenCalled();
  });

  it("devuelve null cuando el número no es de ningún paciente", async () => {
    // Este es el caso que protege la privacidad: el mensaje de un familiar al
    // WhatsApp del profesional no encuentra paciente y no se persiste.
    const pacientes = mockPacienteRepositorio({
      obtenerPorTelefonoE164: vi.fn(async () => null),
    });
    const caso = new ResolverPacientePorTelefono(
      pacientes,
      mockConfiguracionRepositorio({
        obtener: vi.fn(async () => ConfiguracionConsultorio.porDefecto()),
      }),
    );

    expect(await caso.ejecutar("+54 9 11 9999 8888")).toBeNull();
  });

  it("funciona con el consultorio todavía sin configurar", async () => {
    // `obtener()` devuelve null hasta que alguien guarda la configuración por
    // primera vez. Sin el fallback a la configuración por defecto, la ingesta
    // fallaría justo en el consultorio recién dado de alta.
    const paciente = pacienteEjemplo();
    const pacientes = mockPacienteRepositorio({
      obtenerPorTelefonoE164: vi.fn(async () => paciente),
    });
    const caso = new ResolverPacientePorTelefono(
      pacientes,
      mockConfiguracionRepositorio({ obtener: vi.fn(async () => null) }),
    );

    expect(await caso.ejecutar("11 5555 4444")).toBe(paciente);
  });

  it("usa el prefijo de país del consultorio para normalizar", async () => {
    // Un consultorio en otro país carga los números sin prefijo local. Si se
    // usara siempre el argentino, ninguno de sus pacientes matchearía.
    const config = ConfiguracionConsultorio.porDefecto();
    const conPrefijo = ConfiguracionConsultorio.reconstruir({
      ...config.aPrimitivos(),
      whatsappPrefijoPais: "34",
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorTelefonoE164: vi.fn(async () => null),
    });
    const caso = new ResolverPacientePorTelefono(
      pacientes,
      mockConfiguracionRepositorio({ obtener: vi.fn(async () => conPrefijo) }),
    );

    await caso.ejecutar("612345678");

    const [buscado] = (
      pacientes.obtenerPorTelefonoE164 as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string];
    expect(buscado.startsWith("34")).toBe(true);
  });
});
