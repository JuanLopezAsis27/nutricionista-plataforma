import { describe, it, expect, vi } from "vitest";
import { CambiarFotoPerfil } from "./CambiarFotoPerfil";
import { ErrorArchivoInvalido } from "@/dominio/errores/ErrorArchivoInvalido";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import { Archivo } from "@/dominio/entidades/Archivo";
import type { Usuario } from "@/dominio/entidades/Usuario";
import {
  mockUsuarioRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  usuarioEjemplo,
} from "../_ayudas-test";

function fotoDePerfil(id: string): Archivo {
  return Archivo.crear(
    {
      nombreOriginal: "yo.jpg",
      mimeType: "image/jpeg",
      tamanoBytes: 2048,
      contexto: "perfil",
    },
    id,
  );
}

function fotoDeComida(id: string): Archivo {
  return Archivo.crear(
    {
      nombreOriginal: "almuerzo.jpg",
      mimeType: "image/jpeg",
      tamanoBytes: 2048,
      contexto: "foto-comida",
    },
    id,
  );
}

/** Lo que el caso de uso mandó a guardar. */
function guardado(
  usuarios: ReturnType<typeof mockUsuarioRepositorio>,
): Usuario {
  const [primero] = (usuarios.actualizar as ReturnType<typeof vi.fn>).mock
    .calls[0] as [Usuario];
  return primero;
}

describe("CambiarFotoPerfil", () => {
  it("apunta la cuenta a la foto elegida", async () => {
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => usuarioEjemplo()),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => fotoDePerfil("arc-nueva")),
    });
    const caso = new CambiarFotoPerfil(
      usuarios,
      archivos,
      mockAlmacenamientoArchivos(),
    );

    await caso.ejecutar({ usuarioId: "usr-1", archivoId: "arc-nueva" });

    expect(guardado(usuarios).fotoPerfilId).toBe("arc-nueva");
  });

  it("borra la foto anterior, fila y objeto del bucket", async () => {
    // Sin esto cada cambio de foto deja un archivo muerto para siempre: el
    // barrido de huérfanos del worker limpia objetos SIN fila, y esta tiene.
    const anterior = fotoDePerfil("arc-vieja");
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () =>
        usuarioEjemplo().cambiarFotoPerfil("arc-vieja"),
      ),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async (id: string) =>
        id === "arc-vieja" ? anterior : fotoDePerfil(id),
      ),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const caso = new CambiarFotoPerfil(usuarios, archivos, almacenamiento);

    await caso.ejecutar({ usuarioId: "usr-1", archivoId: "arc-nueva" });

    expect(archivos.eliminar).toHaveBeenCalledWith("arc-vieja");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(anterior.clave);
  });

  it("quitar la foto deja la cuenta sin foto y borra la que había", async () => {
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () =>
        usuarioEjemplo().cambiarFotoPerfil("arc-vieja"),
      ),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => fotoDePerfil("arc-vieja")),
    });
    const caso = new CambiarFotoPerfil(
      usuarios,
      archivos,
      mockAlmacenamientoArchivos(),
    );

    await caso.ejecutar({ usuarioId: "usr-1", archivoId: null });

    expect(guardado(usuarios).fotoPerfilId).toBeNull();
    expect(archivos.eliminar).toHaveBeenCalledWith("arc-vieja");
  });

  it("rechaza un archivo que no se subió como foto de perfil", async () => {
    // La foto de una comida del diario es la otra imagen que un paciente puede
    // subir. Aceptarla acá haría que el próximo cambio de foto borrara un
    // registro de su diario.
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => usuarioEjemplo()),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => fotoDeComida("arc-comida")),
    });
    const caso = new CambiarFotoPerfil(
      usuarios,
      archivos,
      mockAlmacenamientoArchivos(),
    );

    await expect(
      caso.ejecutar({ usuarioId: "usr-1", archivoId: "arc-comida" }),
    ).rejects.toThrow(ErrorArchivoInvalido);
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que no existe (o es de otro consultorio)", async () => {
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => usuarioEjemplo()),
    });
    const caso = new CambiarFotoPerfil(
      usuarios,
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );

    await expect(
      caso.ejecutar({ usuarioId: "usr-1", archivoId: "arc-ajena" }),
    ).rejects.toThrow(ErrorArchivoNoEncontrado);
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("elegir la misma foto que ya tenía no borra nada", async () => {
    // El caso del doble clic. Sin la salida temprana, el borrado de "la
    // anterior" se llevaría puesta la foto que se acaba de elegir.
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () =>
        usuarioEjemplo().cambiarFotoPerfil("arc-1"),
      ),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => fotoDePerfil("arc-1")),
    });
    const caso = new CambiarFotoPerfil(
      usuarios,
      archivos,
      mockAlmacenamientoArchivos(),
    );

    await caso.ejecutar({ usuarioId: "usr-1", archivoId: "arc-1" });

    expect(archivos.eliminar).not.toHaveBeenCalled();
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });
});
