import { describe, it, expect } from "vitest";
import { LimitadorTasa } from "./LimitadorTasa";

/** Reloj controlable, para no depender del tiempo real. */
function relojFalso(inicio = 0) {
  let ahora = inicio;
  return {
    leer: () => ahora,
    avanzar: (ms: number) => {
      ahora += ms;
    },
  };
}

describe("LimitadorTasa", () => {
  it("permite hasta el máximo de operaciones dentro de la ventana", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(3, 1000, reloj.leer);

    expect(limitador.intentar("a").permitido).toBe(true);
    expect(limitador.intentar("a").permitido).toBe(true);
    expect(limitador.intentar("a").permitido).toBe(true);
  });

  it("bloquea al superar el máximo", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(2, 1000, reloj.leer);

    limitador.intentar("a");
    limitador.intentar("a");

    const cuarto = limitador.intentar("a");
    expect(cuarto.permitido).toBe(false);
    expect(cuarto.reintentarEnSegundos).toBeGreaterThan(0);
  });

  it("las claves son independientes entre sí", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(1, 1000, reloj.leer);

    expect(limitador.intentar("a").permitido).toBe(true);
    expect(limitador.intentar("a").permitido).toBe(false);
    // Otra clave arranca con su propio contador.
    expect(limitador.intentar("b").permitido).toBe(true);
  });

  it("la ventana se desliza: al vencer los eventos viejos vuelve a permitir", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(2, 1000, reloj.leer);

    limitador.intentar("a");
    limitador.intentar("a");
    expect(limitador.intentar("a").permitido).toBe(false);

    reloj.avanzar(1001);
    expect(limitador.intentar("a").permitido).toBe(true);
  });

  it("un intento rechazado NO extiende el bloqueo", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(1, 1000, reloj.leer);

    limitador.intentar("a"); // consume el único permitido (t=0)

    // Insistir a lo largo de la ventana no debe recontar: si cada rechazo se
    // sumara, quien insiste se auto-prorrogaría el bloqueo indefinidamente.
    reloj.avanzar(500);
    expect(limitador.intentar("a").permitido).toBe(false);
    reloj.avanzar(400);
    expect(limitador.intentar("a").permitido).toBe(false);

    // A los 1001 ms del evento original la ventana se vació igual.
    reloj.avanzar(101);
    expect(limitador.intentar("a").permitido).toBe(true);
  });

  it("informa cuántos segundos faltan para reintentar", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(1, 60_000, reloj.leer);

    limitador.intentar("a");
    reloj.avanzar(20_000);

    const rechazado = limitador.intentar("a");
    expect(rechazado.permitido).toBe(false);
    // Faltan 40 s de los 60 de la ventana.
    expect(rechazado.reintentarEnSegundos).toBe(40);
  });

  it("reiniciar limpia el contador de una clave", () => {
    const reloj = relojFalso();
    const limitador = new LimitadorTasa(1, 1000, reloj.leer);

    limitador.intentar("a");
    expect(limitador.intentar("a").permitido).toBe(false);

    limitador.reiniciar("a");
    expect(limitador.intentar("a").permitido).toBe(true);
  });
});
