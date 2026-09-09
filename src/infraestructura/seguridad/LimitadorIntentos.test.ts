import { describe, it, expect } from "vitest";
import { LimitadorIntentos } from "./LimitadorIntentos";

/** Reloj falso controlable para los tests. */
function reloj(inicio = 0) {
  let t = inicio;
  return {
    ahora: () => t,
    avanzar: (ms: number) => {
      t += ms;
    },
  };
}

describe("LimitadorIntentos", () => {
  it("no bloquea antes de alcanzar el máximo de intentos", () => {
    const r = reloj();
    const lim = new LimitadorIntentos(3, 1000, 5000, r.ahora);

    lim.registrarFallo("k");
    lim.registrarFallo("k");

    expect(lim.estaBloqueada("k").bloqueada).toBe(false);
  });

  it("bloquea al alcanzar el máximo dentro de la ventana", () => {
    const r = reloj();
    const lim = new LimitadorIntentos(3, 1000, 5000, r.ahora);

    lim.registrarFallo("k");
    lim.registrarFallo("k");
    const res = lim.registrarFallo("k"); // 3º fallo → bloquea

    expect(res.bloqueada).toBe(true);
    expect(res.restanteSegundos).toBe(5);
    expect(lim.estaBloqueada("k").bloqueada).toBe(true);
  });

  it("libera la clave cuando pasa el tiempo de bloqueo", () => {
    const r = reloj();
    const lim = new LimitadorIntentos(2, 1000, 5000, r.ahora);

    lim.registrarFallo("k");
    lim.registrarFallo("k"); // bloqueada
    expect(lim.estaBloqueada("k").bloqueada).toBe(true);

    r.avanzar(5001);
    expect(lim.estaBloqueada("k").bloqueada).toBe(false);
  });

  it("los fallos viejos (fuera de la ventana) no cuentan para el bloqueo", () => {
    const r = reloj();
    const lim = new LimitadorIntentos(3, 1000, 5000, r.ahora);

    lim.registrarFallo("k");
    lim.registrarFallo("k");
    r.avanzar(1001); // los dos primeros salen de la ventana
    lim.registrarFallo("k");

    expect(lim.estaBloqueada("k").bloqueada).toBe(false);
  });

  it("un éxito limpia el contador de la clave", () => {
    const r = reloj();
    const lim = new LimitadorIntentos(2, 1000, 5000, r.ahora);

    lim.registrarFallo("k");
    lim.registrarExito("k");
    lim.registrarFallo("k");

    expect(lim.estaBloqueada("k").bloqueada).toBe(false);
  });

  it("las claves son independientes entre sí (IP vs email)", () => {
    const r = reloj();
    const lim = new LimitadorIntentos(2, 1000, 5000, r.ahora);

    lim.registrarFallo("ip:1.2.3.4");
    lim.registrarFallo("ip:1.2.3.4"); // bloquea solo la IP

    expect(lim.estaBloqueada("ip:1.2.3.4").bloqueada).toBe(true);
    expect(lim.estaBloqueada("email:a@b.com").bloqueada).toBe(false);
  });
});
