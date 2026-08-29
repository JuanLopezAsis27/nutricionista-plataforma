import { describe, it, expect, vi } from "vitest";
import { MarcarFotoPrincipal } from "./MarcarFotoPrincipal";
import { EliminarArchivoDeReceta } from "./EliminarArchivoDeReceta";
import { Receta } from "../../entidades/Receta";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { ErrorArchivoNoEncontrado } from "../../errores/ErrorArchivoNoEncontrado";
import {
  mockRecetaRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  recetaEjemplo,
  archivoEjemplo,
} from "../_ayudas-test";

/** Receta con dos fotos y un documento ya guardados. */
function conAdjuntos(fotoPrincipalId: string | null = null): Receta {
  const base = recetaEjemplo().aPrimitivos();
  return Receta.reconstruir({
    ...base,
    fotos: [
      { id: "foto-1", nombreOriginal: "plato.jpg", mimeType: "image/jpeg" },
      { id: "foto-2", nombreOriginal: "corte.jpg", mimeType: "image/jpeg" },
    ],
    documentos: [
      {
        id: "doc-1",
        nombreOriginal: "receta.pdf",
        mimeType: "application/pdf",
      },
    ],
    fotoPrincipalId,
  });
}

describe("MarcarFotoPrincipal", () => {
  it("elige la foto que representa la receta", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => conAdjuntos()),
      actualizar: vi.fn(async (r: Receta) => r),
    });

    const resultado = await new MarcarFotoPrincipal(recetas).ejecutar(
      "rec-1",
      "foto-2",
    );

    expect(resultado.aPrimitivos().fotoPrincipalId).toBe("foto-2");
    expect(resultado.fotoPrincipal?.id).toBe("foto-2");
  });

  // Un id de otra receta dejaría la portada apuntando a algo que la vista
  // nunca encuentra entre sus fotos, y el fallback lo taparía en silencio.
  it("rechaza una foto que no es de la receta", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => conAdjuntos()),
    });

    await expect(
      new MarcarFotoPrincipal(recetas).ejecutar("rec-1", "foto-de-otra"),
    ).rejects.toThrow(ErrorValidacion);
    expect(recetas.actualizar).not.toHaveBeenCalled();
  });

  it("con null vuelve a la elección automática", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => conAdjuntos("foto-2")),
      actualizar: vi.fn(async (r: Receta) => r),
    });

    const resultado = await new MarcarFotoPrincipal(recetas).ejecutar(
      "rec-1",
      null,
    );

    expect(resultado.aPrimitivos().fotoPrincipalId).toBeNull();
    // Sin elegida, la portada es la primera disponible.
    expect(resultado.fotoPrincipal?.id).toBe("foto-1");
  });
});

describe("Receta.fotoPrincipal", () => {
  it("cae en la primera foto cuando la elegida ya no está", () => {
    // Pasa cuando se borra la foto principal: la FK la pone en null, pero un
    // id viejo en memoria no puede dejar la receta sin portada.
    const receta = conAdjuntos("foto-borrada");

    expect(receta.fotoPrincipal?.id).toBe("foto-1");
  });

  it("es null cuando la receta no tiene fotos", () => {
    expect(recetaEjemplo().fotoPrincipal).toBeNull();
  });
});

describe("EliminarArchivoDeReceta", () => {
  function armar(receta: Receta | null) {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => receta),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoEjemplo()),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    return {
      caso: new EliminarArchivoDeReceta(recetas, archivos, almacenamiento),
      archivos,
      almacenamiento,
    };
  }

  it("borra la fila y el objeto del bucket", async () => {
    const { caso, archivos, almacenamiento } = armar(conAdjuntos());

    await caso.ejecutar("rec-1", "foto-1");

    expect(archivos.eliminar).toHaveBeenCalledWith("foto-1");
    expect(almacenamiento.eliminar).toHaveBeenCalled();
  });

  it("borra también los documentos, no solo las fotos", async () => {
    const { caso, archivos } = armar(conAdjuntos());

    await caso.ejecutar("rec-1", "doc-1");

    expect(archivos.eliminar).toHaveBeenCalledWith("doc-1");
  });

  // Sin esta verificación el endpoint sería un borrado de archivos por id: la
  // extensión de inquilino evita que sea de otro consultorio, pero no que sea
  // el laboratorio de un paciente.
  it("no borra un archivo que no es de esa receta", async () => {
    const { caso, archivos } = armar(conAdjuntos());

    await expect(caso.ejecutar("rec-1", "archivo-ajeno")).rejects.toThrow(
      ErrorArchivoNoEncontrado,
    );
    expect(archivos.eliminar).not.toHaveBeenCalled();
  });
});
