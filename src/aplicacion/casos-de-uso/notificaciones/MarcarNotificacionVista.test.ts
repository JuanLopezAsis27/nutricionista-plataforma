import { describe, it, expect, vi } from "vitest";
import { MarcarNotificacionVista } from "./MarcarNotificacionVista";
import { Notificacion } from "@/dominio/entidades/Notificacion";
import { mockNotificacionRepositorio, mockReloj } from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

describe("MarcarNotificacionVista", () => {
  it("con id marca esa sola", async () => {
    const notificaciones = mockNotificacionRepositorio();
    const caso = new MarcarNotificacionVista(notificaciones, mockReloj(AHORA));

    await caso.ejecutar({ id: "not-1" });

    expect(notificaciones.marcarVista).toHaveBeenCalledWith("not-1", AHORA);
    expect(notificaciones.marcarTodasVistas).not.toHaveBeenCalled();
  });

  it("sin id marca todas las del consultorio", async () => {
    const notificaciones = mockNotificacionRepositorio({
      marcarTodasVistas: vi.fn(async () => 4),
    });
    const caso = new MarcarNotificacionVista(notificaciones, mockReloj(AHORA));

    const resultado = await caso.ejecutar({});

    expect(resultado.marcadas).toBe(4);
    expect(notificaciones.marcarTodasVistas).toHaveBeenCalledWith(AHORA);
    expect(notificaciones.marcarVista).not.toHaveBeenCalled();
  });

  it("un id que no existe no lanza", async () => {
    // El repositorio usa `updateMany`, que no toca nada y no falla. Lanzar
    // convertiría un id inventado en una forma de averiguar qué notificaciones
    // existen en otros consultorios.
    const caso = new MarcarNotificacionVista(
      mockNotificacionRepositorio(),
      mockReloj(AHORA),
    );

    await expect(caso.ejecutar({ id: "fantasma" })).resolves.toEqual({
      marcadas: 1,
    });
  });
});

describe("Notificacion — marcar vista", () => {
  function ejemplo(vistoEn: Date | null) {
    return Notificacion.reconstruir({
      id: "not-1",
      tipo: "TURNO_CONFIRMADO",
      titulo: "Ana confirmó su turno",
      detalle: "15/07 a las 10:00",
      pacienteId: "pac-1",
      enlace: "/dashboard/turnos",
      vistoEn,
      creadoEn: new Date("2026-07-10T10:00:00Z"),
    });
  }

  it("marcarla vista es idempotente y conserva la fecha original", async () => {
    // Pisarla haría que "visto hace un mes" se volviera "visto recién" cada vez
    // que se abre la campana.
    const original = new Date("2026-07-11T08:00:00Z");
    const yaVista = ejemplo(original);

    expect(yaVista.marcarVista(AHORA).vistoEn).toEqual(original);
  });

  it("la que no se vio toma la fecha del momento", () => {
    expect(ejemplo(null).marcarVista(AHORA).vistoEn).toEqual(AHORA);
  });

  it("nace sin ver", () => {
    const nueva = Notificacion.crear(
      {
        tipo: "WHATSAPP_ENTRANTE",
        titulo: "Ana escribió por WhatsApp",
        detalle: "Hola",
        pacienteId: "pac-1",
        enlace: null,
      },
      "not-2",
      AHORA,
    );

    expect(nueva.estaVista).toBe(false);
  });
});
