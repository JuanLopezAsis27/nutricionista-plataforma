import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { OptimizadorImagenesSharp } from "./OptimizadorImagenesSharp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * El optimizador con sharp de verdad: que lo que se guarda es chico, que no
 * agranda las imágenes chicas y que una imagen enorme se corta antes de
 * abrirse.
 */

const optimizador = new OptimizadorImagenesSharp();

function imagen(ancho: number, alto: number): Promise<Uint8Array> {
  return sharp({
    create: {
      width: ancho,
      height: alto,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .png()
    .toUint8Array()
    .then((r) => r.data);
}

describe("OptimizadorImagenesSharp", () => {
  it("reduce al lado máximo conservando la proporción, en WebP", async () => {
    const reducida = await optimizador.reducir(
      await imagen(2000, 1000),
      512,
      24_000_000,
    );
    expect(reducida.mimeType).toBe("image/webp");
    expect([reducida.ancho, reducida.alto]).toEqual([512, 256]);
    const metadatos = await sharp(reducida.contenido).metadata();
    expect(metadatos.format).toBe("webp");
  });

  it("no agranda una imagen que ya es chica", async () => {
    const reducida = await optimizador.reducir(
      await imagen(120, 80),
      512,
      24_000_000,
    );
    expect([reducida.ancho, reducida.alto]).toEqual([120, 80]);
  });

  it("corta una imagen con más píxeles que el tope, con un mensaje entendible", async () => {
    await expect(
      optimizador.reducir(await imagen(3000, 3000), 512, 1_000_000),
    ).rejects.toThrow(/megapíxeles/);
  });

  it("un contenido que no es imagen es un error de validación", async () => {
    await expect(
      optimizador.reducir(new TextEncoder().encode("hola"), 512, 24_000_000),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
