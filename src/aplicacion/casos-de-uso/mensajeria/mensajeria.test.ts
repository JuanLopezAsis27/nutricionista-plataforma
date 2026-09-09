import { describe, it, expect, vi } from "vitest";
import { ContarNoLeidos } from "./ContarNoLeidos";
import { ListarConversaciones } from "./ListarConversaciones";
import { ListarMensajes } from "./ListarMensajes";
import { MarcarLeidos } from "./MarcarLeidos";
import { ObtenerConversacionDePaciente } from "./ObtenerConversacionDePaciente";
import { Conversacion } from "@/dominio/entidades/Conversacion";
import { mockMensajeriaRepositorio } from "../_ayudas-test";

/**
 * Tests de la mensajería interna paciente ⇄ nutricionista.
 *
 * El eje de casi todos es el mismo: **la conversación puede no existir
 * todavía.** Se crea con el primer mensaje, así que cada operación tiene que
 * decidir qué hace mientras tanto — y las tres decisiones son distintas y
 * deliberadas: contar devuelve 0, marcar leídos no hace nada, y abrir el hilo
 * la crea.
 */

const conversacion = (id = "conv-1") => Conversacion.crear("pac-1", id);

describe("ContarNoLeidos", () => {
  it("sin pacienteId cuenta TODAS las conversaciones (vista del nutricionista)", async () => {
    const repositorio = mockMensajeriaRepositorio({
      contarNoLeidos: vi.fn(async () => 7),
    });
    const caso = new ContarNoLeidos(repositorio);

    expect(await caso.ejecutar("user-nutri")).toBe(7);
    // Sin segundo argumento: el repositorio suma sobre todas.
    expect(repositorio.contarNoLeidos).toHaveBeenCalledWith("user-nutri");
  });

  it("con pacienteId acota a esa conversación (vista del portal)", async () => {
    // El paciente solo puede ver lo suyo. Si el contador sumara todas las
    // conversaciones del consultorio, la campanita de un paciente mostraría
    // los no leídos de los demás.
    const repositorio = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => conversacion()),
      contarNoLeidos: vi.fn(async () => 3),
    });
    const caso = new ContarNoLeidos(repositorio);

    expect(await caso.ejecutar("user-pac", "pac-1")).toBe(3);
    expect(repositorio.contarNoLeidos).toHaveBeenCalledWith(
      "user-pac",
      "conv-1",
    );
  });

  it("devuelve 0 si el paciente todavía no tiene conversación", async () => {
    const repositorio = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => null),
    });
    const caso = new ContarNoLeidos(repositorio);

    expect(await caso.ejecutar("user-pac", "pac-1")).toBe(0);
    expect(repositorio.contarNoLeidos).not.toHaveBeenCalled();
  });
});

describe("MarcarLeidos", () => {
  it("marca los mensajes de la conversación del paciente", async () => {
    const repositorio = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => conversacion()),
    });
    const caso = new MarcarLeidos(repositorio);

    await caso.ejecutar("pac-1", "user-nutri");

    expect(repositorio.marcarLeidos).toHaveBeenCalledTimes(1);
    const [convId, viewerId] = (
      repositorio.marcarLeidos as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string, Date];
    expect(convId).toBe("conv-1");
    expect(viewerId).toBe("user-nutri");
  });

  it("no hace nada —ni falla— si la conversación no existe", async () => {
    // Abrir el hilo de un paciente que nunca escribió es normal: no hay nada
    // que marcar y tampoco motivo para crear la conversación en una lectura.
    const repositorio = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => null),
    });
    const caso = new MarcarLeidos(repositorio);

    await expect(caso.ejecutar("pac-1", "user-nutri")).resolves.toBeUndefined();
    expect(repositorio.marcarLeidos).not.toHaveBeenCalled();
    expect(repositorio.crearConversacion).not.toHaveBeenCalled();
  });
});

describe("ObtenerConversacionDePaciente", () => {
  it("devuelve la existente sin crear otra", async () => {
    const existente = conversacion("conv-vieja");
    const repositorio = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => existente),
    });
    const caso = new ObtenerConversacionDePaciente(repositorio);

    expect(await caso.ejecutar("pac-1")).toBe(existente);
    expect(repositorio.crearConversacion).not.toHaveBeenCalled();
  });

  it("la crea si no existe: es el upsert que abre el hilo", async () => {
    // A diferencia de MarcarLeidos, acá SÍ se crea. Abrir el hilo es la acción
    // que la inaugura, y sin esto el primer mensaje no tendría dónde ir.
    const repositorio = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => null),
    });
    const caso = new ObtenerConversacionDePaciente(repositorio);

    const creada = await caso.ejecutar("pac-1");

    expect(repositorio.crearConversacion).toHaveBeenCalledTimes(1);
    expect(creada.aPrimitivos().pacienteId).toBe("pac-1");
  });
});

describe("ListarMensajes", () => {
  it("aplica un tope por defecto: un hilo viejo no se trae entero", async () => {
    const repositorio = mockMensajeriaRepositorio();
    const caso = new ListarMensajes(repositorio);

    await caso.ejecutar("conv-1");

    expect(repositorio.listarMensajes).toHaveBeenCalledWith("conv-1", 200);
  });

  it("respeta el límite que le pasen", async () => {
    const repositorio = mockMensajeriaRepositorio();
    const caso = new ListarMensajes(repositorio);

    await caso.ejecutar("conv-1", 50);

    expect(repositorio.listarMensajes).toHaveBeenCalledWith("conv-1", 50);
  });
});

describe("ListarConversaciones", () => {
  it("pide el resumen para el viewer, no para todos", async () => {
    // El resumen incluye los no leídos de QUIEN mira: pedirlo sin viewer
    // mostraría los de otra persona.
    const repositorio = mockMensajeriaRepositorio();
    const caso = new ListarConversaciones(repositorio);

    await caso.ejecutar("user-nutri");

    expect(repositorio.listarResumen).toHaveBeenCalledWith("user-nutri");
  });
});
