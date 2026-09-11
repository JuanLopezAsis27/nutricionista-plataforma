import { describe, it, expect } from "vitest";
import { FirmaConfirmacionTurno } from "./FirmaConfirmacionTurno";
import { ejecutarEnNutricionista } from "@/infraestructura/multitenancy/contextoTenant";

const BASE = "https://app.test";
const AHORA = new Date("2026-07-14T12:00:00Z");
const VENCE = new Date("2026-07-16T00:00:00Z");

function tokenDe(enlace: string): string {
  return new URL(enlace).searchParams.get("token") ?? "";
}

async function enlaceDe(
  firma: FirmaConfirmacionTurno,
  nutricionistaId = "nut-1",
): Promise<string> {
  return ejecutarEnNutricionista(nutricionistaId, async () =>
    firma.generar("tur-1", VENCE),
  );
}

describe("FirmaConfirmacionTurno", () => {
  it("genera un enlace a la página pública que se verifica con su consultorio y turno", async () => {
    const firma = new FirmaConfirmacionTurno("secreto-de-prueba", BASE);

    const enlace = await enlaceDe(firma);

    expect(enlace.startsWith(`${BASE}/confirmar-turno?token=`)).toBe(true);
    expect(firma.verificar(tokenDe(enlace), AHORA)).toEqual({
      nutricionistaId: "nut-1",
      turnoId: "tur-1",
    });
  });

  it("rechaza un enlace vencido", async () => {
    const firma = new FirmaConfirmacionTurno("secreto-de-prueba", BASE);
    const token = tokenDe(await enlaceDe(firma));

    expect(firma.verificar(token, VENCE)).toBeNull();
  });

  it("rechaza un enlace al que le cambiaron el consultorio", async () => {
    const firma = new FirmaConfirmacionTurno("secreto-de-prueba", BASE);
    const [, sello] = tokenDe(await enlaceDe(firma)).split(".");
    const otraCarga = Buffer.from(
      JSON.stringify({ n: "nut-2", t: "tur-1", v: VENCE.getTime() }),
    ).toString("base64url");

    expect(firma.verificar(`${otraCarga}.${sello}`, AHORA)).toBeNull();
  });

  it("rechaza un enlace firmado con otro secreto", async () => {
    const ajena = new FirmaConfirmacionTurno("otro-secreto", BASE);
    const token = tokenDe(await enlaceDe(ajena));

    expect(
      new FirmaConfirmacionTurno("secreto-de-prueba", BASE).verificar(
        token,
        AHORA,
      ),
    ).toBeNull();
  });

  it("rechaza tokens mal formados", () => {
    const firma = new FirmaConfirmacionTurno("secreto-de-prueba", BASE);

    expect(firma.verificar("", AHORA)).toBeNull();
    expect(firma.verificar("sin-punto", AHORA)).toBeNull();
    expect(firma.verificar("a.b.c", AHORA)).toBeNull();
  });

  it("no genera enlaces fuera del alcance de un consultorio", () => {
    const firma = new FirmaConfirmacionTurno("secreto-de-prueba", BASE);

    expect(() => firma.generar("tur-1", VENCE)).toThrow();
  });

  it("exige un secreto", () => {
    expect(() => new FirmaConfirmacionTurno(undefined, BASE)).toThrow();
  });
});
