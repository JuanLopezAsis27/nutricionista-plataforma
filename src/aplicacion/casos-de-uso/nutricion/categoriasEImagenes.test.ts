import { describe, it, expect, vi } from "vitest";
import {
  categoriaDesdeTexto,
  type AlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";
import {
  mockAlimentoPropioRepositorio,
  mockAlmacenamientoArchivos,
  alimentoPropioEjemplo,
} from "../_ayudas-test";
import { CambiarImagenAlimento } from "./CambiarImagenAlimento";
import { QuitarImagenAlimento } from "./QuitarImagenAlimento";
import { ObtenerImagenAlimento } from "./ObtenerImagenAlimento";
import { ImportarAlimentos } from "./ImportarAlimentos";
import { LimpiarArchivosHuerfanos } from "../archivos/LimpiarArchivosHuerfanos";
import { mockArchivoRepositorio } from "../_ayudas-test";

/**
 * Tests de las categorías y las imágenes de los alimentos (migración 84).
 *
 * Lo que fijan: que la planilla reconoce el rubro escrito de varias maneras,
 * que una imagen solo entra si es de verdad una imagen, que reimportar el
 * Excel no borra lo que se cargó a mano, y —el que más importa— que el barrido
 * semanal de huérfanos NO se lleva las imágenes de los alimentos.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

describe("categoriaDesdeTexto", () => {
  it("reconoce el nombre, el código, la primera palabra y el singular", () => {
    expect(categoriaDesdeTexto("Lácteos")).toBe("LACTEOS");
    expect(categoriaDesdeTexto("LACTEOS")).toBe("LACTEOS");
    expect(categoriaDesdeTexto("lácteo")).toBe("LACTEOS");
    expect(categoriaDesdeTexto("Pescados")).toBe("PESCADOS");
    expect(categoriaDesdeTexto("fruta")).toBe("FRUTAS");
    expect(categoriaDesdeTexto("frutos secos")).toBe("FRUTOS_SECOS");
    // Migración 86.
    expect(categoriaDesdeTexto("Embutidos")).toBe("EMBUTIDOS");
    expect(categoriaDesdeTexto("embutido")).toBe("EMBUTIDOS");
  });

  it("un rubro desconocido o vacío es sin categoría, no un error", () => {
    expect(categoriaDesdeTexto("Snacks raros")).toBeNull();
    expect(categoriaDesdeTexto("")).toBeNull();
    expect(categoriaDesdeTexto(null)).toBeNull();
  });
});

describe("CambiarImagenAlimento", () => {
  function casoDeUso(alimento: AlimentoPropio | null) {
    const repositorio = mockAlimentoPropioRepositorio({
      obtenerPorId: vi.fn(async () => alimento),
      actualizar: vi.fn(async (a: AlimentoPropio) => a),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const uc = new CambiarImagenAlimento(
      repositorio,
      almacenamiento,
      "alimentos-propios",
    );
    return { uc, repositorio, almacenamiento };
  }

  it("sube la nueva, apunta la fila y recién después borra la vieja", async () => {
    const conImagen = alimentoPropioEjemplo().conImagen(
      "alimentos-propios/ali-1/vieja.png",
    );
    const { uc, almacenamiento } = casoDeUso(conImagen);

    const resultado = await uc.ejecutar("ali-1", {
      contenido: PNG,
      mimeType: "image/png",
    });

    expect(resultado.imagenClave).toMatch(
      /^alimentos-propios\/ali-1\/.+\.png$/,
    );
    expect(resultado.imagenVersion).not.toBe("vieja");
    expect(almacenamiento.subir).toHaveBeenCalledOnce();
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(
      "alimentos-propios/ali-1/vieja.png",
    );
  });

  it("si la fila no se pudo actualizar, borra la imagen recién subida", async () => {
    const { uc, repositorio, almacenamiento } = casoDeUso(
      alimentoPropioEjemplo(),
    );
    vi.mocked(repositorio.actualizar).mockRejectedValueOnce(new Error("base"));

    await expect(
      uc.ejecutar("ali-1", { contenido: PNG, mimeType: "image/png" }),
    ).rejects.toThrow("base");
    const subida = vi.mocked(almacenamiento.subir).mock.calls[0]![0];
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(subida);
  });

  it("rechaza un formato que no es imagen y un contenido que miente su tipo", async () => {
    const { uc, almacenamiento } = casoDeUso(alimentoPropioEjemplo());
    await expect(
      uc.ejecutar("ali-1", { contenido: PNG, mimeType: "image/gif" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(
      uc.ejecutar("ali-1", {
        contenido: new TextEncoder().encode("<script>"),
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(almacenamiento.subir).not.toHaveBeenCalled();
  });

  it("un alimento que no existe (o es de otro consultorio) no recibe imagen", async () => {
    const { uc } = casoDeUso(null);
    await expect(
      uc.ejecutar("ajeno", { contenido: PNG, mimeType: "image/png" }),
    ).rejects.toBeInstanceOf(ErrorAlimentoPropioNoEncontrado);
  });
});

describe("QuitarImagenAlimento y ObtenerImagenAlimento", () => {
  it("quitar deja la fila sin imagen y borra el objeto", async () => {
    const actualizar = vi.fn(async (a: AlimentoPropio) => a);
    const almacenamiento = mockAlmacenamientoArchivos();
    const resultado = await new QuitarImagenAlimento(
      mockAlimentoPropioRepositorio({
        obtenerPorId: vi.fn(async () =>
          alimentoPropioEjemplo().conImagen("alimentos-base/ali-1/x.jpg"),
        ),
        actualizar,
      }),
      almacenamiento,
    ).ejecutar("ali-1");
    expect(resultado.imagenClave).toBeNull();
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(
      "alimentos-base/ali-1/x.jpg",
    );
  });

  it("obtener devuelve el contenido con el tipo de su extensión", async () => {
    const imagen = await new ObtenerImagenAlimento(
      mockAlimentoPropioRepositorio({
        obtenerPorId: vi.fn(async () =>
          alimentoPropioEjemplo().conImagen("alimentos-base/ali-1/x.webp"),
        ),
      }),
      mockAlmacenamientoArchivos(),
    ).ejecutar("ali-1");
    expect(imagen.mimeType).toBe("image/webp");
  });

  it("obtener de un alimento sin imagen es NO_ENCONTRADO", async () => {
    await expect(
      new ObtenerImagenAlimento(
        mockAlimentoPropioRepositorio({
          obtenerPorId: vi.fn(async () => alimentoPropioEjemplo()),
        }),
        mockAlmacenamientoArchivos(),
      ).ejecutar("ali-1"),
    ).rejects.toBeInstanceOf(ErrorAlimentoPropioNoEncontrado);
  });
});

describe("ImportarAlimentos conserva lo cargado a mano", () => {
  it("un alimento que ya estaba conserva su imagen y su categoría si la planilla no trae", async () => {
    const anterior = alimentoPropioEjemplo({
      nombre: "Arroz",
      categoria: "CEREALES",
    }).conImagen("alimentos-propios/ali-1/foto.png");
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);

    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [anterior]),
        reemplazarTodos,
      }),
    ).ejecutar([
      { nombre: "arroz", caloriasPor100: 128 },
      { nombre: "Leche", categoria: "LACTEOS" },
    ]);

    const [arroz, leche] = reemplazarTodos.mock.calls[0]![0];
    expect(arroz!.imagenClave).toBe("alimentos-propios/ali-1/foto.png");
    expect(arroz!.aPrimitivos().categoria).toBe("CEREALES");
    expect(arroz!.aPrimitivos().caloriasPor100).toBe(128);
    expect(leche!.imagenClave).toBeNull();
    expect(leche!.aPrimitivos().categoria).toBe("LACTEOS");
  });

  it("la categoría de la planilla gana sobre la anterior", async () => {
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [
          alimentoPropioEjemplo({ nombre: "Maní", categoria: "LEGUMBRES" }),
        ]),
        reemplazarTodos,
      }),
    ).ejecutar([{ nombre: "Maní", categoria: "FRUTOS_SECOS" }]);
    expect(reemplazarTodos.mock.calls[0]![0][0]!.aPrimitivos().categoria).toBe(
      "FRUTOS_SECOS",
    );
  });
});

describe("LimpiarArchivosHuerfanos con imágenes de alimentos", () => {
  it("no borra una imagen de alimento aunque no sea un Archivo", async () => {
    const almacenamiento = mockAlmacenamientoArchivos({
      listarClaves: vi.fn(async () => [
        "archivos/uno.pdf",
        "alimentos-propios/a/1.png",
        "alimentos-base/b/2.png",
        "alimentos-base/c/huerfana.png",
      ]),
    });
    const resultado = await new LimpiarArchivosHuerfanos(
      mockArchivoRepositorio({
        listarClaves: vi.fn(async () => ["archivos/uno.pdf"]),
      }),
      almacenamiento,
      [
        {
          listarClavesDeImagen: vi.fn(async () => [
            "alimentos-propios/a/1.png",
          ]),
        },
        { listarClavesDeImagen: vi.fn(async () => ["alimentos-base/b/2.png"]) },
      ],
    ).ejecutar();

    expect(resultado.objetosEliminados).toBe(1);
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(
      "alimentos-base/c/huerfana.png",
    );
  });
});
