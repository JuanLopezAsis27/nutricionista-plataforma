import { describe, it, expect, vi } from "vitest";
import {
  LADO_MAXIMO_IMAGEN_ALIMENTO,
  PIXELES_MAXIMOS_IMAGEN_ALIMENTO,
  TAMANO_MAXIMO_IMAGEN_ALIMENTO,
  type AlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockAlimentoPropioRepositorio,
  mockAlmacenamientoArchivos,
  mockOptimizadorImagenes,
  alimentoPropioEjemplo,
} from "../_ayudas-test";
import { ImagenesDeAlimentos } from "./imagenesDeAlimentos";
import { ImportarAlimentos } from "./ImportarAlimentos";
import { AgregarAlimentos } from "./AgregarAlimentos";

/**
 * Las imágenes que llegan dentro de un Excel: cumplen la MISMA regla que una
 * subida a mano (formato verificado, 2 MB, se guardan reducidas), una que no
 * la cumple no tumba la importación, y el bucket queda prolijo si la
 * escritura falla.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const png = { contenido: PNG, mimeType: "image/png" };

function armar() {
  const almacenamiento = mockAlmacenamientoArchivos();
  const optimizador = mockOptimizadorImagenes();
  const imagenes = new ImagenesDeAlimentos(
    almacenamiento,
    optimizador,
    "alimentos-propios",
  );
  return { almacenamiento, optimizador, imagenes };
}

describe("ImagenesDeAlimentos.preparar", () => {
  it("achica la imagen al tope de lado y de píxeles, y la deja en WebP", async () => {
    const { imagenes, optimizador } = armar();
    const preparada = await imagenes.preparar(png);
    expect(optimizador.reducir).toHaveBeenCalledWith(
      PNG,
      LADO_MAXIMO_IMAGEN_ALIMENTO,
      PIXELES_MAXIMOS_IMAGEN_ALIMENTO,
    );
    expect(preparada.mimeType).toBe("image/webp");
  });

  it("rechaza un formato que no es JPG/PNG/WebP, una firma falsa y lo que pasa de 2 MB", async () => {
    const { imagenes, optimizador } = armar();
    await expect(
      imagenes.preparar({ contenido: PNG, mimeType: "image/gif" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(
      imagenes.preparar({
        contenido: new TextEncoder().encode("<svg>"),
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    const pesada = new Uint8Array(TAMANO_MAXIMO_IMAGEN_ALIMENTO + 1);
    pesada.set(PNG);
    await expect(
      imagenes.preparar({ contenido: pesada, mimeType: "image/png" }),
    ).rejects.toThrow("2 MB");
    expect(optimizador.reducir).not.toHaveBeenCalled();
  });
});

describe("ImportarAlimentos con imágenes", () => {
  it("guarda cada imagen en su alimento y borra la que reemplaza recién después de escribir", async () => {
    const { imagenes, almacenamiento } = armar();
    const arrozConFoto = alimentoPropioEjemplo().conImagen(
      "alimentos-propios/viejo/vieja.png",
    );
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => {
      // Al escribir, la vieja todavía no se borró.
      expect(almacenamiento.eliminar).not.toHaveBeenCalled();
      return a.length;
    });
    const uc = new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [arrozConFoto]),
        reemplazarTodos,
      }),
      null,
      imagenes,
    );

    const resultado = await uc.ejecutar([
      { nombre: "Arroz", imagen: png },
      { nombre: "Pollo" },
      { nombre: "Leche", imagen: { contenido: PNG, mimeType: "image/gif" } },
    ]);

    expect(resultado.imagenes).toEqual({
      cargadas: 1,
      // La que no cumple no frena la importación: se dice por qué.
      descartadas: ["Leche: La imagen tiene que ser JPG, PNG o WebP."],
    });
    const escritos = new Map(
      reemplazarTodos.mock.calls[0]![0].map((a) => [a.etiqueta, a]),
    );
    expect(escritos.get("Arroz")!.imagenClave).toMatch(
      /^alimentos-propios\/.+\.webp$/,
    );
    expect(escritos.get("Pollo")!.imagenClave).toBeNull();
    expect(escritos.get("Leche")!.imagenClave).toBeNull();
    expect(almacenamiento.subir).toHaveBeenCalledOnce();
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(
      "alimentos-propios/viejo/vieja.png",
    );
  });

  it("sin imagen en la planilla, el que ya estaba conserva la suya", async () => {
    const { imagenes, almacenamiento } = armar();
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [
          alimentoPropioEjemplo().conImagen("alimentos-propios/a/foto.webp"),
        ]),
        reemplazarTodos,
      }),
      null,
      imagenes,
    ).ejecutar([{ nombre: "Arroz" }]);

    expect(reemplazarTodos.mock.calls[0]![0][0]!.imagenClave).toBe(
      "alimentos-propios/a/foto.webp",
    );
    expect(almacenamiento.eliminar).not.toHaveBeenCalled();
  });

  it("si la escritura falla, borra las imágenes subidas y no toca las viejas", async () => {
    const { imagenes, almacenamiento } = armar();
    const uc = new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [
          alimentoPropioEjemplo().conImagen("alimentos-propios/a/vieja.png"),
        ]),
        reemplazarTodos: vi.fn(async () => {
          throw new Error("base caída");
        }),
      }),
      null,
      imagenes,
    );

    await expect(
      uc.ejecutar([{ nombre: "Arroz", imagen: png }]),
    ).rejects.toThrow("base caída");
    const subida = vi.mocked(almacenamiento.subir).mock.calls[0]![0];
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(subida);
    expect(almacenamiento.eliminar).not.toHaveBeenCalledWith(
      "alimentos-propios/a/vieja.png",
    );
  });

  it("si el bucket falla, corta sin escribir y limpia lo que ya había subido", async () => {
    const { imagenes, almacenamiento } = armar();
    vi.mocked(almacenamiento.subir)
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("bucket"));
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const uc = new ImportarAlimentos(
      mockAlimentoPropioRepositorio({ reemplazarTodos }),
      null,
      imagenes,
    );

    await expect(
      uc.ejecutar([
        { nombre: "Arroz", imagen: png },
        { nombre: "Pollo", imagen: png },
      ]),
    ).rejects.toThrow("bucket");
    expect(reemplazarTodos).not.toHaveBeenCalled();
    const primera = vi.mocked(almacenamiento.subir).mock.calls[0]![0];
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(primera);
  });
});

describe("la misma imagen en varias filas", () => {
  it("se achica una sola vez, y cada alimento sube su propia copia", async () => {
    const { imagenes, almacenamiento, optimizador } = armar();
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    // El parser les da a las filas con la misma imagen los mismos bytes.
    const compartida = { contenido: PNG, mimeType: "image/png" };

    const resultado = await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({ reemplazarTodos }),
      null,
      imagenes,
    ).ejecutar(
      ["Arroz", "Pollo", "Leche", "Avena", "Pera"].map((nombre) => ({
        nombre,
        imagen: compartida,
      })),
    );

    expect(resultado.imagenes.cargadas).toBe(5);
    expect(optimizador.reducir).toHaveBeenCalledOnce();
    expect(almacenamiento.subir).toHaveBeenCalledTimes(5);
    const claves = reemplazarTodos.mock.calls[0]![0].map((a) => a.imagenClave);
    expect(new Set(claves).size).toBe(5);
  });

  it("si no cumple la regla, se descarta en cada fila que la usa", async () => {
    const { imagenes, optimizador } = armar();
    vi.mocked(optimizador.reducir).mockRejectedValue(
      new ErrorValidacion("La imagen tiene demasiados megapíxeles."),
    );

    const resultado = await new ImportarAlimentos(
      mockAlimentoPropioRepositorio(),
      null,
      imagenes,
    ).ejecutar([
      { nombre: "Arroz", imagen: png },
      { nombre: "Pollo", imagen: png },
    ]);

    expect(resultado.imagenes.cargadas).toBe(0);
    expect(resultado.imagenes.descartadas).toHaveLength(2);
    expect(optimizador.reducir).toHaveBeenCalledOnce();
  });
});

describe("AgregarAlimentos con imágenes", () => {
  it("la imagen entra con el alimento nuevo; el que ya estaba no se toca", async () => {
    const { imagenes, almacenamiento } = armar();
    const agregarVarios = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const resultado = await new AgregarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [alimentoPropioEjemplo()]), // Arroz
        agregarVarios,
      }),
      null,
      imagenes,
    ).ejecutar([
      { nombre: "Arroz", imagen: png },
      { nombre: "Pollo", imagen: png },
    ]);

    expect(resultado.imagenes.cargadas).toBe(1);
    expect(almacenamiento.subir).toHaveBeenCalledOnce();
    const [pollo] = agregarVarios.mock.calls[0]![0];
    expect(pollo!.etiqueta).toBe("Pollo");
    expect(pollo!.imagenClave).toMatch(/\.webp$/);
  });
});
