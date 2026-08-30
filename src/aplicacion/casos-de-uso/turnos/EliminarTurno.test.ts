import { describe, it, expect, vi } from "vitest";
import { EliminarTurno } from "./EliminarTurno";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

function sincronizadorMock(): ISincronizadorCalendario {
  return {
    alAgendar: vi.fn(async () => {}),
    alReprogramar: vi.fn(async () => {}),
    alCancelar: vi.fn(async () => {}),
  };
}

function cancelado(cobro?: { precio: number; pagado: boolean }) {
  const turno = turnoEjemplo();
  // El cobro se registra ANTES de cancelar, que es el orden de la vida real:
  // se cobra la consulta y recién después se anula el turno. `registrarCobro`
  // muta en el lugar y no admite pagado sin precio.
  if (cobro) turno.registrarCobro(cobro.precio, cobro.pagado);
  turno.cambiarEstado("CANCELADO");
  return turno;
}

function armar(turno: ReturnType<typeof turnoEjemplo> | null) {
  const turnos = mockTurnoRepositorio({
    obtenerPorId: vi.fn(async () => turno),
  });
  const sincronizador = sincronizadorMock();
  return {
    caso: new EliminarTurno(turnos, sincronizador),
    turnos,
    sincronizador,
  };
}

describe("EliminarTurno", () => {
  it("borra un turno cancelado y sin cobro", async () => {
    const { caso, turnos } = armar(cancelado());

    await caso.ejecutar("tur-1");

    expect(turnos.eliminar).toHaveBeenCalledWith("tur-1");
  });

  // Si el evento se borrara después de la fila, un fallo de Google dejaría al
  // paciente con un turno fantasma y sin forma de encontrar el id del evento.
  it("borra primero el evento del calendario externo", async () => {
    const { caso, sincronizador } = armar(cancelado());

    await caso.ejecutar("tur-1");

    expect(sincronizador.alCancelar).toHaveBeenCalledWith("tur-1");
  });

  // Un turno vigente no puede desaparecer sin que nadie lo cancele.
  it("no borra un turno que no está cancelado", async () => {
    const { caso, turnos } = armar(turnoEjemplo());

    await expect(caso.ejecutar("tur-1")).rejects.toThrow(ErrorValidacion);
    expect(turnos.eliminar).not.toHaveBeenCalled();
  });

  // Un turno cobrado ya entró en las estadísticas de ingresos: borrarlo
  // descuadraría la caja de un mes que quizá ya está cerrado.
  it("no borra un turno con precio registrado", async () => {
    const { caso, turnos } = armar(cancelado({ precio: 15000, pagado: false }));

    await expect(caso.ejecutar("tur-1")).rejects.toThrow(ErrorValidacion);
    expect(turnos.eliminar).not.toHaveBeenCalled();
  });

  it("no borra un turno marcado como pagado", async () => {
    const { caso, turnos } = armar(cancelado({ precio: 15000, pagado: true }));

    await expect(caso.ejecutar("tur-1")).rejects.toThrow(ErrorValidacion);
    expect(turnos.eliminar).not.toHaveBeenCalled();
  });

  it("falla si el turno no existe", async () => {
    const { caso } = armar(null);

    await expect(caso.ejecutar("tur-x")).rejects.toThrow(
      ErrorTurnoNoEncontrado,
    );
  });
});
