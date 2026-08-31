import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { mapearAntropometria } from "./PrismaRepositorioAntropometria";
import { mapearLaboratorio } from "./PrismaRepositorioLaboratorio";
import { mapearHistoriaClinica } from "./PrismaRepositorioHistoriaClinica";
import { mapearAlertaAlimentaria } from "./PrismaRepositorioAlertaAlimentaria";
import { mapearObjetivoComposicion } from "./PrismaRepositorioObjetivoComposicion";
import { mapearPlantillaAntropometrica } from "./PrismaRepositorioPlantillaAntropometrica";

/**
 * Tests de los mapeadores fila→entidad del módulo de evaluación.
 *
 * POR QUÉ EXISTEN: un mapeador es una lista larga de asignaciones entre campos
 * del MISMO tipo. `tsc` verifica que `circCadera` reciba un número, pero no que
 * reciba el número de la cadera: `circCadera: aNumero(fila.circCintura)`
 * compila perfecto y llega a producción como un dato clínico equivocado.
 *
 * CÓMO LO DETECTAN: cada campo recibe un valor ÚNICO. Si dos campos se cruzan,
 * el valor esperado no aparece donde debe y el test falla. Con valores
 * repetidos ("todos 10") un cruce sería invisible, que es justo el bug a cazar.
 */

const decimal = (n: number): Prisma.Decimal => new Prisma.Decimal(n);

describe("mapearAntropometria", () => {
  // 38 medidas, todas `number | null`, con nombres a un carácter de distancia
  // entre sí (circCinturaMinima/circCinturaMaxima, pliegueSubescapular/
  // pliegueSupraespinal). Es el mapeador con más riesgo de cruce del sistema.
  const medidas = {
    pesoKg: 1,
    tallaCm: 2,
    tallaSentadoCm: 3,
    diamBiacromial: 4,
    diamToraxTransverso: 5,
    diamToraxAnteroposterior: 6,
    diamBiiliocrestideo: 7,
    diamHumeral: 8,
    diamFemoral: 9,
    pliegueTricipital: 10,
    pliegueSubescapular: 11,
    pliegueSupraespinal: 12,
    pliegueAbdominal: 13,
    pliegueMuslo: 14,
    plieguePantorrilla: 15,
    pliegueBicipital: 16,
    pliegueCrestaIliaca: 17,
    plieguePectoral: 30,
    pliegueAxilarMedio: 31,
    pliegueLumbar: 32,
    circTorax: 18,
    circCinturaMinima: 19,
    circCinturaMaxima: 20,
    circCadera: 21,
    circBrazo: 22,
    circBrazoContraido: 23,
    circCabeza: 24,
    circAntebrazo: 25,
    circMusloMaximo: 26,
    circMusloMedial: 27,
    circPantorrilla: 28,
    kgGrasa: 29,
  } as const;

  const fila = {
    id: "antro-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    fecha: new Date("2026-03-01T00:00:00.000Z"),
    nivelActividad: "MODERADO",
    protocolo: "ISAK_5",
    metodoGrasa: "YUHASZ",
    observaciones: "sin novedades",
    creadoEn: new Date("2026-03-01T10:30:00.000Z"),
    actualizadoEn: new Date("2026-03-02T11:00:00.000Z"),
    ...Object.fromEntries(
      Object.entries(medidas).map(([clave, valor]) => [clave, decimal(valor)]),
    ),
  } as unknown as Parameters<typeof mapearAntropometria>[0];

  it("asigna cada medida a su propio campo, sin cruzarlas", () => {
    const datos = mapearAntropometria(fila).aPrimitivos();

    // Comparación campo a campo: si dos se cruzaron, los valores únicos no
    // coinciden y el mensaje de fallo nombra exactamente cuál se movió.
    for (const [clave, esperado] of Object.entries(medidas)) {
      expect(datos[clave as keyof typeof medidas], `campo ${clave}`).toBe(
        esperado,
      );
    }
  });

  it("copia identidad, fechas y campos no numéricos", () => {
    const datos = mapearAntropometria(fila).aPrimitivos();

    expect(datos.id).toBe("antro-1");
    expect(datos.pacienteId).toBe("pac-1");
    expect(datos.fecha).toEqual(new Date("2026-03-01T00:00:00.000Z"));
    expect(datos.creadoEn).toEqual(new Date("2026-03-01T10:30:00.000Z"));
    expect(datos.nivelActividad).toBe("MODERADO");
    expect(datos.protocolo).toBe("ISAK_5");
    expect(datos.metodoGrasa).toBe("YUHASZ");
    expect(datos.observaciones).toBe("sin novedades");
  });

  it("convierte los Decimal de Prisma a number, no a string", () => {
    // Si un Decimal se filtrara sin convertir, superjson no lo serializa y la
    // medición llega rota al navegador. El tipo no lo impide: Decimal tiene
    // toString() y encaja donde se espera algo imprimible.
    const datos = mapearAntropometria(fila).aPrimitivos();

    expect(typeof datos.pesoKg).toBe("number");
    expect(typeof datos.circCadera).toBe("number");
    expect(datos.pesoKg).not.toBeInstanceOf(Prisma.Decimal);
  });

  it("deja en null las medidas ausentes en vez de convertirlas a 0", () => {
    // 0 y null significan cosas distintas: "midió cero" no existe, "no se
    // midió" sí. Un `?? 0` acá inventaría datos clínicos.
    const vacia = {
      ...fila,
      tallaCm: null,
      pliegueTricipital: null,
      circCadera: null,
      kgGrasa: null,
    } as unknown as Parameters<typeof mapearAntropometria>[0];

    const datos = mapearAntropometria(vacia).aPrimitivos();

    expect(datos.tallaCm).toBeNull();
    expect(datos.pliegueTricipital).toBeNull();
    expect(datos.circCadera).toBeNull();
    expect(datos.kgGrasa).toBeNull();
    // El peso es obligatorio: sigue estando.
    expect(datos.pesoKg).toBe(1);
  });
});

describe("mapearLaboratorio", () => {
  const fila = {
    id: "lab-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    fecha: new Date("2026-02-10T00:00:00.000Z"),
    titulo: "Perfil lipidico",
    notas: "en ayunas",
    creadoEn: new Date("2026-02-10T09:00:00.000Z"),
    actualizadoEn: new Date("2026-02-10T09:00:00.000Z"),
    archivos: [
      {
        id: "arch-1",
        nombreOriginal: "analisis.pdf",
        mimeType: "application/pdf",
        tamanoBytes: 2048,
      },
    ],
  } as unknown as Parameters<typeof mapearLaboratorio>[0];

  it("copia los campos del laboratorio a la entidad", () => {
    const datos = mapearLaboratorio(fila).aPrimitivos();

    expect(datos.id).toBe("lab-1");
    expect(datos.pacienteId).toBe("pac-1");
    expect(datos.fecha).toEqual(new Date("2026-02-10T00:00:00.000Z"));
    expect(datos.titulo).toBe("Perfil lipidico");
    expect(datos.notas).toBe("en ayunas");
  });

  it("mapea los adjuntos sin arrastrar campos de mas del Archivo", () => {
    // El adjunto se proyecta a un subconjunto: la fila de Archivo trae ademas
    // clave de almacenamiento y nutricionistaId, que no deben cruzar al dominio.
    const datos = mapearLaboratorio(fila).aPrimitivos();

    expect(datos.adjuntos).toEqual([
      {
        id: "arch-1",
        nombreOriginal: "analisis.pdf",
        mimeType: "application/pdf",
        tamanoBytes: 2048,
      },
    ]);
  });
});

describe("mapearHistoriaClinica", () => {
  const fila = {
    id: "hist-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    motivoConsulta: "motivo",
    diagnosticos: "diagnosticos",
    medicacion: "medicacion",
    antecedentesPersonales: "personales",
    antecedentesFamiliares: "familiares",
    habitos: "habitos",
    contexto: "contexto",
    creadoEn: new Date("2026-01-05T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-06T00:00:00.000Z"),
  } as unknown as Parameters<typeof mapearHistoriaClinica>[0];

  it("no cruza los campos de texto libre entre sí", () => {
    // Cinco campos `string | null` consecutivos: el escenario clásico donde un
    // copiar-pegar deja "antecedentes familiares" dentro de "personales".
    const datos = mapearHistoriaClinica(fila).aPrimitivos();

    expect(datos.motivoConsulta).toBe("motivo");
    expect(datos.diagnosticos).toBe("diagnosticos");
    expect(datos.medicacion).toBe("medicacion");
    expect(datos.antecedentesPersonales).toBe("personales");
    expect(datos.antecedentesFamiliares).toBe("familiares");
    expect(datos.habitos).toBe("habitos");
    expect(datos.contexto).toBe("contexto");
  });
});

describe("mapearAlertaAlimentaria", () => {
  const fila = {
    id: "alerta-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    tipo: "ALERGIA",
    severidad: "ALTA",
    descripcion: "frutos secos",
    notas: "epinefrina a mano",
    creadoEn: new Date("2026-01-02T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-02T00:00:00.000Z"),
  } as unknown as Parameters<typeof mapearAlertaAlimentaria>[0];

  it("preserva tipo y severidad como valores distintos", () => {
    const datos = mapearAlertaAlimentaria(fila).aPrimitivos();

    expect(datos.id).toBe("alerta-1");
    expect(datos.pacienteId).toBe("pac-1");
    expect(datos.tipo).toBe("ALERGIA");
    expect(datos.severidad).toBe("ALTA");
    expect(datos.descripcion).toBe("frutos secos");
    expect(datos.notas).toBe("epinefrina a mano");
  });
});

describe("mapearObjetivoComposicion", () => {
  const fila = {
    id: "obj-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    variable: "MASA_GRASA",
    metodoGrasa: "YUHASZ",
    valorObjetivo: decimal(18.5),
    fechaObjetivo: new Date("2026-06-01T00:00:00.000Z"),
    estado: "ACTIVO",
    notas: "meta de temporada",
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
  } as unknown as Parameters<typeof mapearObjetivoComposicion>[0];

  it("convierte el valor objetivo de Decimal a number", () => {
    const datos = mapearObjetivoComposicion(fila).aPrimitivos();

    expect(datos.valorObjetivo).toBe(18.5);
    expect(typeof datos.valorObjetivo).toBe("number");
    expect(datos.variable).toBe("MASA_GRASA");
    expect(datos.estado).toBe("ACTIVO");
    expect(datos.notas).toBe("meta de temporada");
  });
});

describe("mapearPlantillaAntropometrica", () => {
  const base = {
    id: "plant-1",
    nutricionistaId: "nutri-1",
    nombre: "ISAK reducido",
    descripcion: "para control rapido",
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("conserva los campos que el dominio sigue conociendo", () => {
    const fila = {
      ...base,
      campos: ["tallaCm", "circCadera", "pliegueTricipital"],
    } as unknown as Parameters<typeof mapearPlantillaAntropometrica>[0];

    const datos = mapearPlantillaAntropometrica(fila).aPrimitivos();

    expect(datos.campos).toEqual([
      "tallaCm",
      "circCadera",
      "pliegueTricipital",
    ]);
  });

  it("descarta los campos que el dominio ya no conoce, sin romper la carga", () => {
    // Comportamiento documentado del mapeador: una plantilla vieja guardada con
    // una medida que se retiró del modelo se degrada a lo que sigue existiendo
    // en vez de tumbar la pantalla. Esto es una REGLA, no un detalle.
    const fila = {
      ...base,
      campos: ["tallaCm", "medidaQueYaNoExiste", "circCadera"],
    } as unknown as Parameters<typeof mapearPlantillaAntropometrica>[0];

    const datos = mapearPlantillaAntropometrica(fila).aPrimitivos();

    expect(datos.campos).toEqual(["tallaCm", "circCadera"]);
  });
});
