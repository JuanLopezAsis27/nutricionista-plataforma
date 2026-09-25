import { describe, it, expect } from "vitest";
import { FirmaEnlacesTurno } from "./FirmaEnlacesTurno";
import { ejecutarEnNutricionista } from "@/infraestructura/multitenancy/contextoTenant";

const BASE = "https://app.test";
const AHORA = new Date("2026-07-14T12:00:00Z");
const VENCE = new Date("2026-07-16T00:00:00Z");

function tokenDe(enlace: string): string {
  return new URL(enlace).searchParams.get("token") ?? "";
}

async function enlaceDe(
  firma: FirmaEnlacesTurno,
  nutricionistaId = "nut-1",
): Promise<string> {
  return ejecutarEnNutricionista(nutricionistaId, async () =>
    firma.generar("CONFIRMAR", "tur-1", VENCE),
  );
}

describe("FirmaEnlacesTurno", () => {
  it("genera un enlace a la página pública que se verifica con su consultorio y turno", async () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);

    const enlace = await enlaceDe(firma);

    expect(enlace.startsWith(`${BASE}/confirmar-turno?token=`)).toBe(true);
    expect(firma.verificar("CONFIRMAR", tokenDe(enlace), AHORA)).toEqual({
      nutricionistaId: "nut-1",
      turnoId: "tur-1",
    });
  });

  it("rechaza un enlace vencido", async () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);
    const token = tokenDe(await enlaceDe(firma));

    expect(firma.verificar("CONFIRMAR", token, VENCE)).toBeNull();
  });

  it("rechaza un enlace al que le cambiaron el consultorio", async () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);
    const [, sello] = tokenDe(await enlaceDe(firma)).split(".");
    const otraCarga = Buffer.from(
      JSON.stringify({ n: "nut-2", t: "tur-1", v: VENCE.getTime() }),
    ).toString("base64url");

    expect(
      firma.verificar("CONFIRMAR", `${otraCarga}.${sello}`, AHORA),
    ).toBeNull();
  });

  it("rechaza un enlace firmado con otro secreto", async () => {
    const ajena = new FirmaEnlacesTurno("otro-secreto", BASE);
    const token = tokenDe(await enlaceDe(ajena));

    expect(
      new FirmaEnlacesTurno("secreto-de-prueba", BASE).verificar(
        "CONFIRMAR",
        token,
        AHORA,
      ),
    ).toBeNull();
  });

  it("un enlace de confirmar no sirve para cancelar, ni al revés", async () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);
    const confirmar = tokenDe(await enlaceDe(firma));
    const cancelar = tokenDe(
      await ejecutarEnNutricionista("nut-1", async () =>
        firma.generar("CANCELAR", "tur-1", VENCE),
      ),
    );

    expect(firma.verificar("CANCELAR", confirmar, AHORA)).toBeNull();
    expect(firma.verificar("CONFIRMAR", cancelar, AHORA)).toBeNull();
    expect(firma.verificar("CANCELAR", cancelar, AHORA)).toEqual({
      nutricionistaId: "nut-1",
      turnoId: "tur-1",
    });
  });

  it("cada acción apunta a su propia página", () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);
    expect(firma.prefijo("CONFIRMAR")).toBe(`${BASE}/confirmar-turno?token=`);
    expect(firma.prefijo("CANCELAR")).toBe(`${BASE}/cancelar-turno?token=`);
  });

  it("rechaza tokens mal formados", () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);

    expect(firma.verificar("CONFIRMAR", "", AHORA)).toBeNull();
    expect(firma.verificar("CONFIRMAR", "sin-punto", AHORA)).toBeNull();
    expect(firma.verificar("CONFIRMAR", "a.b.c", AHORA)).toBeNull();
  });

  it("no genera enlaces fuera del alcance de un consultorio", () => {
    const firma = new FirmaEnlacesTurno("secreto-de-prueba", BASE);

    expect(() => firma.generar("CONFIRMAR", "tur-1", VENCE)).toThrow();
  });

  it("exige un secreto", () => {
    expect(() => new FirmaEnlacesTurno(undefined, BASE)).toThrow();
  });
});
