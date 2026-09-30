import { describe, it, expect, vi } from "vitest";
import { liberarDiaDeOtras } from "./diaAsignado";

/** Entidad mínima: lo único que la función mira es el día y el id. */
class Plantilla {
  constructor(
    readonly id: string,
    readonly diasAntes: number | null,
  ) {}
  liberarDia(): Plantilla {
    return new Plantilla(this.id, null);
  }
}

function armar() {
  return {
    actualizar: vi.fn(async (p: Plantilla) => p),
  };
}

describe("liberarDiaDeOtras", () => {
  it("libera el día de la otra que lo tenía, para que quede UNA por día", async () => {
    const repo = armar();
    const todas = [new Plantilla("a", 3), new Plantilla("b", 1)];

    await liberarDiaDeOtras(repo, todas, 3, "nueva");

    expect(repo.actualizar).toHaveBeenCalledOnce();
    expect(repo.actualizar).toHaveBeenCalledWith(new Plantilla("a", null));
  });

  it("no se libera a sí misma al volver a guardarse con su día", async () => {
    const repo = armar();

    await liberarDiaDeOtras(repo, [new Plantilla("a", 3)], 3, "a");

    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("si nadie tenía ese día no escribe nada", async () => {
    const repo = armar();

    await liberarDiaDeOtras(
      repo,
      [new Plantilla("a", 1), new Plantilla("b", null)],
      3,
      null,
    );

    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("una plantilla nueva (sin id todavía) libera a todas las que lo tengan", async () => {
    const repo = armar();

    await liberarDiaDeOtras(
      repo,
      [new Plantilla("a", 3), new Plantilla("b", 3)],
      3,
      null,
    );

    expect(repo.actualizar).toHaveBeenCalledTimes(2);
  });
});
