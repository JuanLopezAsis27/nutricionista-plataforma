import { describe, it, expect } from "vitest";
import { finDelDia } from "./PrismaRepositorioEstadisticas";

/**
 * El borde superior del rango de estadísticas.
 *
 * `desde` y `hasta` llegan como medianoche UTC y significan DÍAS completos,
 * los dos incluidos. Con `Turno.fecha`, que es un DATE, `lte: hasta` alcanza;
 * con `Paciente.creadoEn`, que es un TIMESTAMP, no: un alta de hoy a las 10:50
 * es mayor que la medianoche de hoy y quedaba afuera.
 *
 * El síntoma era engañoso: un paciente recién creado no aparecía en "pacientes
 * nuevos", pero al día siguiente aparecía solo. Eso hacía sospechar del alta
 * —sobre todo del alta desde documento, que era la que se estaba probando—
 * cuando el problema estaba en el filtro.
 *
 * Como los repositorios de Prisma no se testean directamente, lo que se fija
 * acá es la función que decide el borde.
 */
describe("finDelDia", () => {
  const HOY = new Date("2026-09-13T00:00:00.000Z");

  it("es la medianoche del día siguiente (tope exclusivo)", () => {
    expect(finDelDia(HOY).toISOString()).toBe("2026-09-14T00:00:00.000Z");
  });

  it("deja adentro un alta de hoy a cualquier hora", () => {
    // El caso real: el paciente creado hoy a las 10:50 tiene que contar hoy.
    const creadoHoy = new Date("2026-09-13T10:50:37.115Z");
    expect(creadoHoy.getTime()).toBeLessThan(finDelDia(HOY).getTime());
    // Y, para que se vea el bug que había: contra la medianoche quedaba afuera.
    expect(creadoHoy.getTime()).toBeGreaterThan(HOY.getTime());
  });

  it("deja adentro el último milisegundo del día", () => {
    const casiMedianoche = new Date("2026-09-13T23:59:59.999Z");
    expect(casiMedianoche.getTime()).toBeLessThan(finDelDia(HOY).getTime());
  });

  it("deja AFUERA el día siguiente", () => {
    // El tope es exclusivo: si no, el rango "hasta el 13" contaría el 14.
    const manana = new Date("2026-09-14T00:00:00.000Z");
    expect(manana.getTime()).toBeGreaterThanOrEqual(finDelDia(HOY).getTime());
  });

  it("no depende del huso horario de la máquina", () => {
    // Se suma un día en UTC, no se reconstruye la fecha con el reloj local:
    // al oeste de Greenwich eso correría el borde y el bug volvería en otro
    // horario. Es la misma trampa que la de `getUTCDay()` en los turnos.
    const enero = new Date("2026-01-31T00:00:00.000Z");
    expect(finDelDia(enero).toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });
});
