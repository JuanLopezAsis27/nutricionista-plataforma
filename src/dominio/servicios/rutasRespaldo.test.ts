import { describe, it, expect } from "vitest";
import {
  carpetaDePaciente,
  rutasDeArchivo,
  RutasUnicas,
  segmento,
} from "./rutasRespaldo";
import type { ArchivoUbicado } from "../repositorios/IUbicacionArchivosRepositorio";

const carpetas = new Map([
  ["pac-1", "Pacientes/García Ana"],
  ["pac-2", "Pacientes/López Juan"],
]);
const fecha = new Date("2026-07-01T00:00:00Z");

function archivo(
  ubicacion: ArchivoUbicado["ubicacion"],
  nombreOriginal = "foto.JPG",
): ArchivoUbicado {
  return { id: "arc-1", nombreOriginal, ubicacion };
}

describe("segmento", () => {
  it("saca los caracteres que Windows prohíbe y el punto final", () => {
    expect(segmento('a/b\\c:d*e?"f<g>h|i.')).toBe("a b c d e f g h i");
  });

  it("nunca queda vacío", () => {
    expect(segmento("  ///  ")).toBe("sin nombre");
  });
});

describe("carpetaDePaciente", () => {
  it("es Apellido Nombre y marca a los archivados", () => {
    expect(
      carpetaDePaciente({ nombre: "Ana", apellido: "García", archivado: true }),
    ).toBe("Pacientes/García Ana (archivado)");
  });
});

describe("rutasDeArchivo", () => {
  it("la foto de una comida va al diario del paciente, fechada y con su franja", () => {
    expect(
      rutasDeArchivo(
        archivo({
          tipo: "DIARIO",
          pacienteId: "pac-1",
          fecha,
          franja: "Desayuno",
        }),
        carpetas,
      ),
    ).toEqual(["Pacientes/García Ana/Diario/2026-07-01 Desayuno.jpg"]);
  });

  it("una foto de progreso va aparte del resto de los archivos", () => {
    expect(
      rutasDeArchivo(
        archivo({
          tipo: "PACIENTE",
          pacienteId: "pac-1",
          fechaProgreso: fecha,
        }),
        carpetas,
      ),
    ).toEqual(["Pacientes/García Ana/Fotos de progreso/2026-07-01 foto.JPG"]);
    expect(
      rutasDeArchivo(
        archivo({ tipo: "PACIENTE", pacienteId: "pac-1", fechaProgreso: null }),
        carpetas,
      ),
    ).toEqual(["Pacientes/García Ana/Archivos/foto.JPG"]);
  });

  it("el archivo de un plan va a la carpeta de CADA paciente que lo tiene", () => {
    expect(
      rutasDeArchivo(
        archivo(
          { tipo: "PLAN", plan: "Plan base", pacienteIds: ["pac-1", "pac-2"] },
          "plan.pdf",
        ),
        carpetas,
      ),
    ).toEqual([
      "Pacientes/García Ana/Planes/Plan base/plan.pdf",
      "Pacientes/López Juan/Planes/Plan base/plan.pdf",
    ]);
  });

  it("un plan sin pacientes, una receta o un huérfano van a «Sin paciente»", () => {
    expect(
      rutasDeArchivo(
        archivo({ tipo: "PLAN", plan: "Plantilla", pacienteIds: [] }, "p.pdf"),
        carpetas,
      ),
    ).toEqual(["Sin paciente/Planes/Plantilla/p.pdf"]);
    expect(
      rutasDeArchivo(archivo({ tipo: "RECETA", receta: "Tarta" }), carpetas),
    ).toEqual(["Sin paciente/Recetas/Tarta/foto.JPG"]);
    expect(rutasDeArchivo(archivo({ tipo: "SIN_DUENO" }), carpetas)).toEqual([
      "Sin paciente/Otros/foto.JPG",
    ]);
  });

  it("si el paciente no tiene carpeta, el archivo no se pierde", () => {
    expect(
      rutasDeArchivo(
        archivo({ tipo: "PACIENTE", pacienteId: "otro", fechaProgreso: null }),
        carpetas,
      ),
    ).toEqual(["Sin paciente/Otros/foto.JPG"]);
  });
});

describe("RutasUnicas", () => {
  it("desempata antes de la extensión y sin distinguir mayúsculas", () => {
    const rutas = new RutasUnicas();
    expect(rutas.reservar("a/Foto.jpg")).toBe("a/Foto.jpg");
    expect(rutas.reservar("a/foto.jpg")).toBe("a/foto (2).jpg");
    expect(rutas.reservar("a/foto.jpg")).toBe("a/foto (3).jpg");
  });

  it("una carpeta desempata al final aunque su nombre tenga un punto", () => {
    const rutas = new RutasUnicas();
    rutas.reservarCarpeta("Pacientes/Pérez J.R");
    expect(rutas.reservarCarpeta("Pacientes/Pérez J.R")).toBe(
      "Pacientes/Pérez J.R (2)",
    );
  });
});
