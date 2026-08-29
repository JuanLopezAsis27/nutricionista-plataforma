import { describe, it, expect, vi } from "vitest";
import { ObtenerConfiguracionRecordatorios } from "./ObtenerConfiguracionRecordatorios";
import { GuardarConfiguracionRecordatorios } from "./GuardarConfiguracionRecordatorios";
import { ConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";
import { mockConfiguracionRecordatoriosRepositorio } from "../_ayudas-test";

/**
 * Tests de la configuración de recordatorios.
 *
 * Los dos casos de uso son cortos pero cargan una decisión de diseño que vale
 * la pena fijar: **la política vigente existe antes de que nadie la guarde.**
 * La fila se crea recién con el primer cambio, y hasta entonces el sistema
 * responde con los valores de fábrica en vez de null. Si eso se rompiera, un
 * consultorio recién dado de alta tendría la pantalla de recordatorios vacía y
 * el barrido automático sin criterio.
 */

describe("ObtenerConfiguracionRecordatorios", () => {
  it("devuelve los valores de fábrica mientras no haya fila guardada", async () => {
    const caso = new ObtenerConfiguracionRecordatorios(
      mockConfiguracionRecordatoriosRepositorio({
        obtener: vi.fn(async () => null),
      }),
    );

    const config = await caso.ejecutar();

    expect(config).toBeInstanceOf(ConfiguracionRecordatorios);

    // Se comparan los campos de POLÍTICA y no el objeto entero: `porDefecto()`
    // sella id, `creadoEn` y `actualizadoEn` con un uuid y el reloj de cada
    // llamada, así que un `toEqual` completo compararía identidades distintas y
    // fallaría siempre. Lo que este test afirma es la política, no la fila.
    const {
      id: _id,
      creadoEn: _c,
      actualizadoEn: _a,
      ...politica
    } = config.aPrimitivos();
    const {
      id: _id2,
      creadoEn: _c2,
      actualizadoEn: _a2,
      ...esperada
    } = ConfiguracionRecordatorios.porDefecto().aPrimitivos();

    expect(politica).toEqual(esperada);
  });

  it("devuelve la configuración guardada cuando existe", async () => {
    const guardada = ConfiguracionRecordatorios.porDefecto().actualizar({
      whatsappDiasAntes: [7, 1],
    });
    const caso = new ObtenerConfiguracionRecordatorios(
      mockConfiguracionRecordatoriosRepositorio({
        obtener: vi.fn(async () => guardada),
      }),
    );

    expect((await caso.ejecutar()).aPrimitivos().whatsappDiasAntes).toEqual([
      7, 1,
    ]);
  });
});

describe("GuardarConfiguracionRecordatorios", () => {
  it("aplica los cambios sobre la configuración vigente", async () => {
    // Un cambio parcial no puede borrar el resto: guardar "email activo" no
    // apaga WhatsApp.
    const vigente = ConfiguracionRecordatorios.porDefecto().actualizar({
      whatsappActivo: true,
      whatsappDiasAntes: [3, 1],
    });
    const repositorio = mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(async () => vigente),
    });
    const caso = new GuardarConfiguracionRecordatorios(repositorio);

    await caso.ejecutar({ emailActivo: true });

    const [guardada] = (repositorio.guardar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [ConfiguracionRecordatorios];
    const datos = guardada.aPrimitivos();
    expect(datos.emailActivo).toBe(true);
    expect(datos.whatsappActivo).toBe(true);
    expect(datos.whatsappDiasAntes).toEqual([3, 1]);
  });

  it("parte de la configuración de fábrica si todavía no hay fila", async () => {
    // El primer guardado del consultorio: sin este fallback habría que
    // preguntarle a la entidad por un estado que no existe.
    const repositorio = mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(async () => null),
    });
    const caso = new GuardarConfiguracionRecordatorios(repositorio);

    await caso.ejecutar({ whatsappActivo: true });

    expect(repositorio.guardar).toHaveBeenCalledTimes(1);
    const [guardada] = (repositorio.guardar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [ConfiguracionRecordatorios];
    expect(guardada.aPrimitivos().whatsappActivo).toBe(true);
  });

  it("valida el conjunto completo, no solo los campos que llegaron", async () => {
    // La razón por la que el caso de uso aplica los cambios sobre la entidad en
    // vez de guardar el parcial: los invariantes son DEL CONJUNTO. Validar
    // campo por campo los deja pasar de a uno.
    const repositorio = mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(async () => null),
    });
    const caso = new GuardarConfiguracionRecordatorios(repositorio);

    await expect(caso.ejecutar({ horaEnvio: "25:99" })).rejects.toThrow();
    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("normaliza la programación al guardar: sin repetidos y de mayor a menor", async () => {
    // Contracara del test de `mapeadores.comunicacion.test.ts`, que fija que
    // reconstruir NO normaliza. Acá sí: la invariante se impone al escribir.
    const repositorio = mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(async () => null),
    });
    const caso = new GuardarConfiguracionRecordatorios(repositorio);

    await caso.ejecutar({ whatsappDiasAntes: [1, 7, 3, 3] });

    const [guardada] = (repositorio.guardar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [ConfiguracionRecordatorios];
    expect(guardada.aPrimitivos().whatsappDiasAntes).toEqual([7, 3, 1]);
  });
});
