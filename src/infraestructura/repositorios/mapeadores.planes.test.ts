import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { mapearPlan, mapearAsignacionPlan } from "./PrismaRepositorioPlan";
import { mapearReceta } from "./PrismaRepositorioReceta";
import { mapearGrupoPlan } from "./PrismaRepositorioGrupoPlan";
import { mapearMaterial } from "./PrismaRepositorioMaterial";

/**
 * Tests de los mapeadores de planes, recetas y biblioteca.
 *
 * Estos mapeadores no solo copian campos: varios aplican REGLAS (separar fotos
 * de documentos por mime type, aplanar el nombre de la receta dentro de una
 * opción, colapsar una relación ausente a null). Esas reglas viven en
 * infraestructura y hasta ahora no las verificaba nadie.
 */

const decimal = (n: number): Prisma.Decimal => new Prisma.Decimal(n);

describe("mapearPlan", () => {
  const fila = {
    id: "plan-1",
    nutricionistaId: "nutri-1",
    nombre: "Plan de descenso",
    descripcion: "fase 1",
    esPlantilla: false,
    planOrigenId: null,
    archivado: false,
    caloriasMeta: 2000,
    proteinasMetaG: decimal(150),
    carbohidratosMetaG: decimal(200),
    grasasMetaG: decimal(60),
    contactosUtiles: "nutricionista de guardia",
    modalidad: "APP",
    grupoId: "grupo-1",
    grupo: { nombre: "Descenso" },
    archivoPrincipalId: "arch-principal",
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-02T00:00:00.000Z"),
    comidas: [
      {
        id: "comida-1",
        nombre: "Desayuno",
        horaDesde: "08:00",
        horaHasta: "09:00",
        orden: 1,
        opciones: [
          {
            id: "op-1",
            numero: 1,
            contenido: "Avena con fruta",
            recetaId: "rec-1",
            orden: 1,
            receta: {
              nombre: "Avena base",
              calorias: decimal(310),
              proteinasG: decimal(11),
              carbohidratosG: decimal(52),
              grasasG: decimal(6),
            },
          },
          {
            id: "op-2",
            numero: 2,
            contenido: "Tostadas",
            recetaId: null,
            orden: 2,
            receta: null,
          },
        ],
      },
    ],
    equivalencias: [
      { id: "eq-1", titulo: "Lacteos", detalle: "1 taza = 200ml", orden: 1 },
    ],
    recomendaciones: [
      {
        id: "reco-1",
        tipo: "HIDRATACION",
        texto: "2 litros por dia",
        orden: 1,
      },
    ],
    archivos: [
      {
        id: "arch-principal",
        nombreOriginal: "plan.pdf",
        mimeType: "application/pdf",
        tamanoBytes: 1024,
      },
    ],
  } as unknown as Parameters<typeof mapearPlan>[0];

  it("copia los campos propios del plan", () => {
    const datos = mapearPlan(fila).aPrimitivos();

    expect(datos.id).toBe("plan-1");
    expect(datos.nombre).toBe("Plan de descenso");
    expect(datos.descripcion).toBe("fase 1");
    expect(datos.esPlantilla).toBe(false);
    expect(datos.archivado).toBe(false);
    expect(datos.modalidad).toBe("APP");
    expect(datos.archivoPrincipalId).toBe("arch-principal");
  });

  it("no cruza las cuatro metas de macros entre si", () => {
    // caloriasMeta es Int y las otras tres Decimal: cuatro campos numericos
    // consecutivos con nombres casi iguales.
    const datos = mapearPlan(fila).aPrimitivos();

    expect(datos.caloriasMeta).toBe(2000);
    expect(datos.proteinasMetaG).toBe(150);
    expect(datos.carbohidratosMetaG).toBe(200);
    expect(datos.grasasMetaG).toBe(60);
  });

  it("conserva la jerarquia comidas -> opciones sin aplanarla", () => {
    const datos = mapearPlan(fila).aPrimitivos();

    expect(datos.comidas).toHaveLength(1);
    expect(datos.comidas[0]!.nombre).toBe("Desayuno");
    expect(datos.comidas[0]!.horaDesde).toBe("08:00");
    expect(datos.comidas[0]!.horaHasta).toBe("09:00");
    expect(datos.comidas[0]!.opciones).toHaveLength(2);
    expect(datos.comidas[0]!.opciones[0]!.contenido).toBe("Avena con fruta");
    expect(datos.comidas[0]!.opciones[1]!.contenido).toBe("Tostadas");
  });

  it("aplana el nombre y los macros de la receta dentro de la opcion", () => {
    const opcion = mapearPlan(fila).aPrimitivos().comidas[0]!.opciones[0]!;

    expect(opcion.recetaId).toBe("rec-1");
    expect(opcion.recetaNombre).toBe("Avena base");
    expect(opcion.recetaMacros).toEqual({
      calorias: 310,
      proteinasG: 11,
      carbohidratosG: 52,
      grasasG: 6,
    });
  });

  it("deja receta ausente en null en vez de en un objeto vacio", () => {
    // Una opcion escrita a mano no tiene receta. Si el mapeador devolviera
    // `{calorias: null, ...}` la UI mostraria una tarjeta de macros vacia.
    const opcion = mapearPlan(fila).aPrimitivos().comidas[0]!.opciones[1]!;

    expect(opcion.recetaId).toBeNull();
    expect(opcion.recetaNombre).toBeNull();
    expect(opcion.recetaMacros).toBeNull();
  });

  it("aplana el nombre del grupo, y lo deja null si el plan esta suelto", () => {
    expect(mapearPlan(fila).aPrimitivos().grupoNombre).toBe("Descenso");

    const suelto = {
      ...fila,
      grupoId: null,
      grupo: null,
    } as unknown as Parameters<typeof mapearPlan>[0];

    const datos = mapearPlan(suelto).aPrimitivos();
    expect(datos.grupoId).toBeNull();
    expect(datos.grupoNombre).toBeNull();
  });

  it("mapea equivalencias, recomendaciones y archivos por separado", () => {
    // Tres colecciones hermanas: cruzar dos es un error que compila.
    const datos = mapearPlan(fila).aPrimitivos();

    expect(datos.equivalencias).toEqual([
      { id: "eq-1", titulo: "Lacteos", detalle: "1 taza = 200ml", orden: 1 },
    ]);
    expect(datos.recomendaciones).toEqual([
      {
        id: "reco-1",
        tipo: "HIDRATACION",
        texto: "2 litros por dia",
        orden: 1,
      },
    ]);
    expect(datos.archivos).toEqual([
      {
        id: "arch-principal",
        nombreOriginal: "plan.pdf",
        mimeType: "application/pdf",
        tamanoBytes: 1024,
      },
    ]);
  });
});

describe("mapearAsignacionPlan", () => {
  it("distingue las tres fechas de la asignacion", () => {
    // fechaInicio, fechaFin y finalizadaEn significan cosas distintas:
    // cuando empezo, cuando estaba PLANIFICADO que termine, y cuando dejo de
    // regir de verdad. Cruzarlas corrompe el historial del paciente.
    const asignacion = mapearAsignacionPlan({
      id: "asig-1",
      nutricionistaId: "nutri-1",
      planId: "plan-1",
      nombrePlan: "Plan de descenso",
      pacienteId: "pac-1",
      fechaInicio: new Date("2026-01-01T00:00:00.000Z"),
      fechaFin: new Date("2026-03-01T00:00:00.000Z"),
      finalizadaEn: new Date("2026-02-15T00:00:00.000Z"),
      activa: false,
    } as unknown as Parameters<typeof mapearAsignacionPlan>[0]);

    expect(asignacion.fechaInicio).toEqual(
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(asignacion.fechaFin).toEqual(new Date("2026-03-01T00:00:00.000Z"));
    expect(asignacion.finalizadaEn).toEqual(
      new Date("2026-02-15T00:00:00.000Z"),
    );
    expect(asignacion.activa).toBe(false);
    expect(asignacion.nombrePlan).toBe("Plan de descenso");
  });

  it("sobrevive al borrado del plan: planId null, nombre conservado", () => {
    // El nombre es una foto tomada al asignar, justamente para que la
    // asignacion siga siendo legible cuando el plan ya no existe.
    const asignacion = mapearAsignacionPlan({
      id: "asig-2",
      nutricionistaId: "nutri-1",
      planId: null,
      nombrePlan: "Plan borrado",
      pacienteId: "pac-1",
      fechaInicio: new Date("2026-01-01T00:00:00.000Z"),
      fechaFin: null,
      finalizadaEn: null,
      activa: true,
    } as unknown as Parameters<typeof mapearAsignacionPlan>[0]);

    expect(asignacion.planId).toBeNull();
    expect(asignacion.nombrePlan).toBe("Plan borrado");
  });
});

describe("mapearReceta", () => {
  const fila = {
    id: "rec-1",
    nutricionistaId: "nutri-1",
    nombre: "Ensalada tibia",
    descripcion: "rapida",
    porciones: 2,
    preparacion: "mezclar",
    etiquetas: ["vegetariana"],
    enlaces: ["https://ejemplo.test/receta"],
    fotoPrincipalId: "foto-1",
    calorias: decimal(420),
    proteinasG: decimal(18),
    carbohidratosG: decimal(40),
    grasasG: decimal(20),
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    ingredientes: [
      {
        nombre: "Quinoa",
        cantidadGramos: decimal(80),
        caloriasPor100: decimal(120),
        proteinasPor100: decimal(4),
        carbohidratosPor100: decimal(21),
        grasasPor100: decimal(2),
        fuente: "PROPIO",
        referenciaExterna: null,
      },
    ],
    fotos: [
      { id: "foto-1", nombreOriginal: "plato.jpg", mimeType: "image/jpeg" },
      { id: "foto-2", nombreOriginal: "paso.png", mimeType: "image/png" },
      {
        id: "doc-1",
        nombreOriginal: "receta.pdf",
        mimeType: "application/pdf",
      },
    ],
  } as unknown as Parameters<typeof mapearReceta>[0];

  it("separa fotos de documentos por mime type", () => {
    // Esto NO es copiar campos: es una regla de negocio que vive en el
    // mapeador. Los archivos llegan en una sola relacion y se reparten segun
    // sean imagenes o no. Si la condicion se invierte, la galeria muestra PDFs.
    const datos = mapearReceta(fila).aPrimitivos();

    expect(datos.fotos.map((f) => f.id)).toEqual(["foto-1", "foto-2"]);
    expect(datos.documentos.map((d) => d.id)).toEqual(["doc-1"]);
  });

  it("clasifica cualquier image/* como foto, no solo jpeg", () => {
    const conWebp = {
      ...fila,
      fotos: [
        { id: "w-1", nombreOriginal: "a.webp", mimeType: "image/webp" },
        { id: "d-1", nombreOriginal: "b.docx", mimeType: "application/msword" },
      ],
    } as unknown as Parameters<typeof mapearReceta>[0];

    const datos = mapearReceta(conWebp).aPrimitivos();

    expect(datos.fotos.map((f) => f.id)).toEqual(["w-1"]);
    expect(datos.documentos.map((d) => d.id)).toEqual(["d-1"]);
  });

  it("no cruza los macros de la receta con los del ingrediente", () => {
    // La receta tiene calorias/proteinasG y el ingrediente caloriasPor100/
    // proteinasPor100. Son escalas distintas: confundirlas multiplica por 100.
    const datos = mapearReceta(fila).aPrimitivos();

    expect(datos.calorias).toBe(420);
    expect(datos.proteinasG).toBe(18);
    expect(datos.carbohidratosG).toBe(40);
    expect(datos.grasasG).toBe(20);

    expect(datos.ingredientes[0]!.cantidadGramos).toBe(80);
    expect(datos.ingredientes[0]!.caloriasPor100).toBe(120);
    expect(datos.ingredientes[0]!.proteinasPor100).toBe(4);
    expect(datos.ingredientes[0]!.carbohidratosPor100).toBe(21);
    expect(datos.ingredientes[0]!.grasasPor100).toBe(2);
  });

  it("conserva etiquetas y enlaces como listas separadas", () => {
    const datos = mapearReceta(fila).aPrimitivos();

    expect(datos.etiquetas).toEqual(["vegetariana"]);
    expect(datos.enlaces).toEqual(["https://ejemplo.test/receta"]);
    expect(datos.porciones).toBe(2);
  });
});

describe("mapearGrupoPlan", () => {
  it("copia los campos de la carpeta", () => {
    const grupo = mapearGrupoPlan({
      id: "grupo-1",
      nutricionistaId: "nutri-1",
      nombre: "Descenso",
      descripcion: "planes de descenso",
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-02T00:00:00.000Z"),
    }).aPrimitivos();

    expect(grupo.id).toBe("grupo-1");
    expect(grupo.nombre).toBe("Descenso");
    expect(grupo.descripcion).toBe("planes de descenso");
  });
});

describe("mapearMaterial", () => {
  it("copia los campos del material de biblioteca", () => {
    const material = mapearMaterial({
      id: "mat-1",
      nutricionistaId: "nutri-1",
      titulo: "Guia de porciones",
      descripcion: "para imprimir",
      categoria: "GUIA",
      etiquetas: ["porciones"],
      archivoId: "arch-1",
      archivo: {
        id: "arch-1",
        nombreOriginal: "guia.pdf",
        mimeType: "application/pdf",
        tamanoBytes: 4096,
      },
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearMaterial>[0]).aPrimitivos();

    expect(material.id).toBe("mat-1");
    expect(material.titulo).toBe("Guia de porciones");
    expect(material.descripcion).toBe("para imprimir");
    expect(material.categoria).toBe("GUIA");
  });
});
