import { describe, it, expect } from "vitest";
import { esquema as esquemaReceta } from "./recetas/FormularioReceta";
import { esquema as esquemaPlan } from "./planes/FormularioPlan";
import { esquema as esquemaCarpeta } from "./planes/NavegadorCarpetas";
import { esquema as esquemaAsignacion } from "./planes/FormularioAsignacionPlan";
import { esquema as esquemaTurno } from "./turnos/FormularioTurno";
import { esquema as esquemaReprogramar } from "./turnos/FormularioReprogramar";
import { esquema as esquemaMaterial } from "./biblioteca/FormularioMaterial";
import { esquema as esquemaObjetivo } from "./objetivos/FormularioObjetivo";
import { esquema as esquemaSuplemento } from "./seguimiento/SeccionSuplementos";
import { esquema as esquemaPlantilla } from "./secretaria/FormularioPlantilla";
import {
  esquemaPerfil,
  esquemaCompetencia,
} from "./deportivo/SeccionDeportiva";
import { partirEtiquetas, partirEnlaces } from "@/lib/validacionListas";

import { crearRecetaDto } from "@/aplicacion/dtos/receta.dto";
import { crearPlanDto, grupoPlanDto } from "@/aplicacion/dtos/plan.dto";
import {
  agendarTurnoDto,
  reprogramarTurnoDto,
} from "@/aplicacion/dtos/turno.dto";
import { crearMaterialDto } from "@/aplicacion/dtos/material.dto";
import { crearObjetivoDto } from "@/aplicacion/dtos/objetivo.dto";
import { registrarSuplementoDto } from "@/aplicacion/dtos/seguimiento.dto";
import { crearPlantillaDto } from "@/aplicacion/dtos/secretaria.dto";
import {
  guardarPerfilDeportivoDto,
  crearCompetenciaDto,
} from "@/aplicacion/dtos/deportivo.dto";

/**
 * Coherencia formulario ↔ DTO, tanda 2: los once formularios restantes.
 *
 * Continúa `coherencia-formularios.test.ts`. Aquel cubrió los dos de
 * contraseña, donde aparecieron las primeras divergencias; al revisar el resto
 * aparecieron seis más, todas de la misma familia: **el formulario acota menos
 * que el servidor**, así que la pantalla da por bueno un valor que la mutación
 * después rechaza.
 *
 * La regla direccional es la misma: el formulario puede ser MÁS estricto que el
 * servidor (validar que dos contraseñas coincidan, que la fecha de fin no sea
 * anterior a la de inicio), nunca menos.
 */

describe("FormularioReceta vs crearRecetaDto", () => {
  const base = {
    nombre: "Ensalada tibia",
    descripcion: "",
    porciones: "2",
    ingredientes: [],
    preparacion: "",
    etiquetas: "",
    enlaces: "",
    calorias: "",
    proteinasG: "",
    carbohidratosG: "",
    grasasG: "",
  };

  it("rechaza un enlace sin protocolo, igual que el servidor", () => {
    // EL BUG QUE ESTE TEST CIERRA: pegar "google.com" es lo más natural del
    // mundo. El formulario lo aceptaba (solo miraba el largo del textarea) y el
    // DTO lo rechazaba con "Debe ser una URL válida".
    expect(
      crearRecetaDto.safeParse({ nombre: "X", enlaces: ["google.com"] })
        .success,
    ).toBe(false);

    expect(
      esquemaReceta.safeParse({ ...base, enlaces: "google.com" }).success,
    ).toBe(false);
  });

  it("acepta un enlace absoluto", () => {
    expect(
      esquemaReceta.safeParse({
        ...base,
        enlaces: "https://ejemplo.test/receta",
      }).success,
    ).toBe(true);
  });

  it("rechaza una etiqueta más larga que el máximo por elemento", () => {
    const larga = "a".repeat(61);

    expect(
      crearRecetaDto.safeParse({ nombre: "X", etiquetas: [larga] }).success,
    ).toBe(false);

    expect(esquemaReceta.safeParse({ ...base, etiquetas: larga }).success).toBe(
      false,
    );
  });

  it("rechaza más etiquetas de las que admite el DTO", () => {
    const muchas = Array.from({ length: 31 }, (_, i) => `e${i}`);

    expect(
      crearRecetaDto.safeParse({ nombre: "X", etiquetas: muchas }).success,
    ).toBe(false);

    expect(
      esquemaReceta.safeParse({ ...base, etiquetas: muchas.join(",") }).success,
    ).toBe(false);
  });

  it("rechaza macros por encima del techo del DTO", () => {
    expect(
      crearRecetaDto.safeParse({ nombre: "X", proteinasG: 10_001 }).success,
    ).toBe(false);

    expect(
      esquemaReceta.safeParse({ ...base, proteinasG: "10001" }).success,
    ).toBe(false);
  });

  it("rechaza porciones fuera del rango 1..100", () => {
    for (const porciones of ["0", "101"]) {
      expect(
        esquemaReceta.safeParse({ ...base, porciones }).success,
        `porciones ${porciones}`,
      ).toBe(false);
    }
    expect(esquemaReceta.safeParse({ ...base, porciones: "4" }).success).toBe(
      true,
    );
  });

  it("el corte de listas del esquema es el mismo que el del envío", () => {
    // Si el esquema validara una lista y `alEnviar` armara otra, la validación
    // no diría nada sobre lo que realmente viaja. Ambos usan estos helpers.
    expect(partirEtiquetas("  liviana , sin tacc ,, ")).toEqual([
      "liviana",
      "sin tacc",
    ]);
    expect(partirEnlaces("https://a.test\nhttps://b.test,")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });
});

describe("FormularioTurno / FormularioReprogramar vs turno.dto", () => {
  const base = {
    pacienteId: "pac-1",
    fecha: "2026-05-10",
    hora: "10:00",
    duracion: "30",
    notas: "",
  };

  it("rechaza una duración mayor a la que admite el servidor", () => {
    expect(
      agendarTurnoDto.safeParse({
        pacienteId: "pac-1",
        fecha: new Date(),
        hora: "10:00",
        duracionMinutos: 481,
      }).success,
    ).toBe(false);

    expect(esquemaTurno.safeParse({ ...base, duracion: "481" }).success).toBe(
      false,
    );
    expect(
      esquemaReprogramar.safeParse({
        fecha: base.fecha,
        hora: base.hora,
        duracion: "481",
      }).success,
    ).toBe(false);
  });

  it("rechaza una duración de cero o negativa", () => {
    for (const duracion of ["0", "-30"]) {
      expect(
        esquemaTurno.safeParse({ ...base, duracion }).success,
        `duracion ${duracion}`,
      ).toBe(false);
    }
  });

  it("rechaza notas más largas que el máximo del DTO", () => {
    const largas = "a".repeat(1001);

    expect(
      agendarTurnoDto.safeParse({
        pacienteId: "pac-1",
        fecha: new Date(),
        hora: "10:00",
        notas: largas,
      }).success,
    ).toBe(false);

    expect(esquemaTurno.safeParse({ ...base, notas: largas }).success).toBe(
      false,
    );
  });

  it("acepta un turno válido", () => {
    expect(esquemaTurno.safeParse(base).success).toBe(true);
    expect(
      reprogramarTurnoDto.safeParse({
        id: "t-1",
        fecha: new Date(),
        hora: "10:00",
        duracionMinutos: 30,
      }).success,
    ).toBe(true);
  });
});

describe("SeccionDeportiva vs deportivo.dto", () => {
  const base = {
    deporte: "Judo",
    disciplina: "",
    nivel: "COMPETITIVO" as const,
    fase: "PRETEMPORADA" as const,
    diasEntrenamientoSemana: "5",
    horasSemana: "12",
    pesoCategoriaKg: "73",
    posicion: "",
    objetivo: "",
    notas: "",
  };

  it("respeta el PISO de peso de categoría, no solo el techo", () => {
    // `pesoCategoriaKg` es el único campo del sistema con mínimo distinto de
    // cero (20 kg). El formulario no miraba ningún rango, así que aceptaba 5.
    expect(
      guardarPerfilDeportivoDto.safeParse({
        pacienteId: "pac-1",
        deporte: "Judo",
        pesoCategoriaKg: 5,
      }).success,
    ).toBe(false);

    expect(
      esquemaPerfil.safeParse({ ...base, pesoCategoriaKg: "5" }).success,
    ).toBe(false);
    expect(
      esquemaPerfil.safeParse({ ...base, pesoCategoriaKg: "401" }).success,
    ).toBe(false);
    expect(esquemaPerfil.safeParse(base).success).toBe(true);
  });

  it("acota días de entrenamiento a una semana real", () => {
    expect(
      esquemaPerfil.safeParse({ ...base, diasEntrenamientoSemana: "15" })
        .success,
    ).toBe(false);
  });

  it("acota las horas semanales al máximo del DTO", () => {
    expect(
      esquemaPerfil.safeParse({ ...base, horasSemana: "81" }).success,
    ).toBe(false);
  });

  it("la competencia coincide con crearCompetenciaDto", () => {
    const competencia = {
      nombre: "Nacional",
      fecha: "2026-09-20",
      lugar: "",
      importancia: "A" as const,
      objetivo: "",
      resultado: "",
      notas: "",
    };
    expect(esquemaCompetencia.safeParse(competencia).success).toBe(true);

    // El nombre es obligatorio en los dos lados.
    expect(
      esquemaCompetencia.safeParse({ ...competencia, nombre: "" }).success,
    ).toBe(false);
    expect(
      crearCompetenciaDto.safeParse({
        pacienteId: "pac-1",
        nombre: "",
        fecha: new Date(),
        importancia: "A",
      }).success,
    ).toBe(false);

    // Y objetivo/resultado cortan en 300 en ambos.
    expect(
      esquemaCompetencia.safeParse({
        ...competencia,
        resultado: "a".repeat(301),
      }).success,
    ).toBe(false);
  });
});

describe("FormularioMaterial vs crearMaterialDto", () => {
  const base = {
    titulo: "Guia de porciones",
    descripcion: "",
    url: "",
    categoria: "",
    etiquetas: "",
  };

  it("rechaza una etiqueta más larga que el máximo por elemento", () => {
    const larga = "a".repeat(61);

    expect(
      crearMaterialDto.safeParse({
        titulo: "X",
        tipo: "ENLACE",
        etiquetas: [larga],
      }).success,
    ).toBe(false);

    expect(
      esquemaMaterial.safeParse({ ...base, etiquetas: larga }).success,
    ).toBe(false);
  });

  it("coincide en los límites de título, descripción y categoría", () => {
    expect(
      esquemaMaterial.safeParse({ ...base, titulo: "a".repeat(201) }).success,
    ).toBe(false);
    expect(
      esquemaMaterial.safeParse({ ...base, descripcion: "a".repeat(2001) })
        .success,
    ).toBe(false);
    expect(
      esquemaMaterial.safeParse({ ...base, categoria: "a".repeat(81) }).success,
    ).toBe(false);
    expect(esquemaMaterial.safeParse(base).success).toBe(true);
  });
});

describe("FormularioPlan vs crearPlanDto", () => {
  const base = {
    nombre: "Plan de descenso",
    descripcion: "",
    esPlantilla: false,
    caloriasMeta: "",
    proteinasMetaG: "",
    carbohidratosMetaG: "",
    grasasMetaG: "",
    contactosUtiles: "",
    comidas: [
      {
        nombre: "Desayuno",
        horaDesde: "",
        horaHasta: "",
        opciones: [{ contenido: "Avena", recetaId: "" }],
      },
    ],
    modalidad: "APP" as const,
    grupoId: "__suelto__",
    archivoPrincipalId: null,
    equivalencias: [],
    recomendaciones: [],
  };

  it("acota las metas de macros como el DTO", () => {
    expect(
      crearPlanDto.safeParse({ nombre: "X", proteinasMetaG: 10_001 }).success,
    ).toBe(false);

    expect(
      esquemaPlan.safeParse({ ...base, proteinasMetaG: "10001" }).success,
    ).toBe(false);
    expect(
      esquemaPlan.safeParse({ ...base, caloriasMeta: "100001" }).success,
    ).toBe(false);
    expect(
      esquemaPlan.safeParse({ ...base, caloriasMeta: "2000" }).success,
    ).toBe(true);
  });

  it("acota la cantidad de equivalencias y recomendaciones", () => {
    const equivalencias = Array.from({ length: 101 }, (_, i) => ({
      titulo: `t${i}`,
      detalle: `d${i}`,
    }));

    expect(esquemaPlan.safeParse({ ...base, equivalencias }).success).toBe(
      false,
    );
  });

  it("exige al menos una comida en modalidad APP", () => {
    // Regla propia del formulario, ya existente: se fija para que no se pierda.
    expect(esquemaPlan.safeParse({ ...base, comidas: [] }).success).toBe(false);
  });
});

describe("Formularios que ya coincidían con su DTO", () => {
  // Estos no tenían divergencias. El test los fija igual: son el punto de
  // referencia que avisa si alguien cambia un límite de un solo lado.

  it("NavegadorCarpetas coincide con grupoPlanDto", () => {
    expect(
      esquemaCarpeta.safeParse({ nombre: "", descripcion: "" }).success,
    ).toBe(false);
    expect(grupoPlanDto.safeParse({ nombre: "" }).success).toBe(false);

    expect(
      esquemaCarpeta.safeParse({ nombre: "a".repeat(81), descripcion: "" })
        .success,
    ).toBe(false);
    expect(
      esquemaCarpeta.safeParse({ nombre: "Descenso", descripcion: "" }).success,
    ).toBe(true);
  });

  it("FormularioObjetivo coincide con crearObjetivoDto", () => {
    const base = {
      titulo: "Mejorar adherencia",
      descripcion: "",
      prioridad: "ALTA" as const,
      fechaObjetivo: "",
      objetivoComposicionId: "",
    };

    expect(esquemaObjetivo.safeParse(base).success).toBe(true);
    expect(
      esquemaObjetivo.safeParse({ ...base, titulo: "a".repeat(201) }).success,
    ).toBe(false);
    expect(
      crearObjetivoDto.safeParse({
        pacienteId: "p-1",
        titulo: "a".repeat(201),
        prioridad: "ALTA",
      }).success,
    ).toBe(false);
  });

  it("SeccionSuplementos coincide con registrarSuplementoDto", () => {
    const base = {
      nombre: "Vitamina D",
      dosis: "",
      frecuencia: "",
      desde: "",
      hasta: "",
      notas: "",
    };

    expect(esquemaSuplemento.safeParse(base).success).toBe(true);
    expect(
      esquemaSuplemento.safeParse({ ...base, dosis: "a".repeat(121) }).success,
    ).toBe(false);
    expect(
      registrarSuplementoDto.safeParse({
        pacienteId: "p-1",
        nombre: "Vitamina D",
        dosis: "a".repeat(121),
      }).success,
    ).toBe(false);
  });

  it("SeccionSuplementos exige que 'hasta' no sea anterior a 'desde'", () => {
    // Regla MÁS estricta que el servidor, y está bien que lo sea: es guía de
    // UI. El test la fija para que no se caiga en un refactor.
    expect(
      esquemaSuplemento.safeParse({
        nombre: "Vitamina D",
        dosis: "",
        frecuencia: "",
        desde: "2026-06-01",
        hasta: "2026-01-01",
        notas: "",
      }).success,
    ).toBe(false);
  });

  it("FormularioPlantilla coincide con crearPlantillaDto", () => {
    const base = {
      clave: "SEGUIMIENTO",
      nombre: "Seguimiento mensual",
      asunto: "Como venís este mes",
      cuerpoHtml: "<p>Hola</p>",
      descripcion: "",
    };

    expect(esquemaPlantilla.safeParse(base).success).toBe(true);
    expect(crearPlantillaDto.safeParse(base).success).toBe(true);

    // La clave es un identificador, no texto libre: el formulario lo exige con
    // un regex y el servidor solo con un largo. Es el formulario siendo MÁS
    // estricto, que es la dirección permitida.
    expect(
      esquemaPlantilla.safeParse({ ...base, clave: "con espacios" }).success,
    ).toBe(false);
  });

  it("FormularioAsignacionPlan exige fin posterior al inicio", () => {
    const base = {
      planId: "plan-1",
      pacienteId: "pac-1",
      fechaInicio: "2026-01-01",
      fechaFin: "2026-03-01",
    };

    expect(esquemaAsignacion.safeParse(base).success).toBe(true);
    expect(
      esquemaAsignacion.safeParse({ ...base, fechaFin: "2025-12-01" }).success,
    ).toBe(false);
  });
});
