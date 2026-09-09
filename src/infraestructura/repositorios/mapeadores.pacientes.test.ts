import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { mapearPaciente } from "./PrismaRepositorioPaciente";
import { mapearUsuario } from "./PrismaRepositorioUsuario";
import { mapearTurno } from "./PrismaRepositorioTurno";
import { mapearSuplemento } from "./PrismaRepositorioSuplemento";
import { mapearAlertaSeguimiento } from "./PrismaRepositorioAlertaSeguimiento";
import { mapearCompetencia } from "./PrismaRepositorioCompetencia";
import { mapearPerfilDeportivo } from "./PrismaRepositorioPerfilDeportivo";
import { mapearObjetivo } from "./PrismaRepositorioObjetivo";
import { mapearRegistroDiario } from "./PrismaRepositorioRegistroDiario";
import { mapearMetricaDispositivo } from "./PrismaRepositorioMetricaDispositivo";

/** Tests de los mapeadores del paciente y su seguimiento. */

const decimal = (n: number): Prisma.Decimal => new Prisma.Decimal(n);

describe("mapearPaciente", () => {
  const fila = {
    id: "pac-1",
    nutricionistaId: "nutri-1",
    nombre: "Ana",
    apellido: "Gomez",
    email: "ana@ejemplo.test",
    telefono: "11 5555 4444",
    telefonoE164: "+541155554444",
    fechaNacimiento: new Date("1990-05-20T00:00:00.000Z"),
    sexo: "FEMENINO",
    notas: "prefiere turnos por la manana",
    archivadoEn: null,
    motivoArchivado: null,
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    actualizadoEn: new Date("2026-01-02T00:00:00.000Z"),
  } as unknown as Parameters<typeof mapearPaciente>[0];

  it("no cruza nombre con apellido", () => {
    // Dos strings adyacentes del mismo tipo: el cruce mas facil de cometer y
    // el mas visible para el usuario final.
    const datos = mapearPaciente(fila).aPrimitivos();

    expect(datos.nombre).toBe("Ana");
    expect(datos.apellido).toBe("Gomez");
  });

  it("distingue el telefono escrito del normalizado a E.164", () => {
    // Cruzarlos rompe el envio por WhatsApp: la API necesita E.164 exacto.
    const datos = mapearPaciente(fila).aPrimitivos();

    expect(datos.telefono).toBe("11 5555 4444");
    expect(datos.telefonoE164).toBe("+541155554444");
  });

  it("mapea el archivado como fecha y motivo, no como booleano", () => {
    const activo = mapearPaciente(fila).aPrimitivos();
    expect(activo.archivadoEn).toBeNull();
    expect(activo.motivoArchivado).toBeNull();

    const archivado = mapearPaciente({
      ...fila,
      archivadoEn: new Date("2026-06-01T00:00:00.000Z"),
      motivoArchivado: "alta",
    }).aPrimitivos();

    expect(archivado.archivadoEn).toEqual(new Date("2026-06-01T00:00:00.000Z"));
    expect(archivado.motivoArchivado).toBe("alta");
  });
});

describe("mapearUsuario", () => {
  it("no cruza pacienteId con nutricionistaId", () => {
    // Ambos son `string | null` y ambos son identificadores de persona.
    // Cruzarlos en un mapeador de IDENTIDAD es un problema de acceso, no de
    // presentacion: decide que ve cada quien.
    const datos = mapearUsuario({
      id: "user-1",
      email: "ana@ejemplo.test",
      passwordHash: "$2a$10$hash",
      rol: "PACIENTE",
      pacienteId: "pac-1",
      nutricionistaId: "nutri-1",
      activo: true,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearUsuario>[0]).aPrimitivos();

    expect(datos.pacienteId).toBe("pac-1");
    expect(datos.nutricionistaId).toBe("nutri-1");
    expect(datos.rol).toBe("PACIENTE");
    expect(datos.activo).toBe(true);
    expect(datos.passwordHash).toBe("$2a$10$hash");
  });
});

describe("mapearTurno", () => {
  const base = {
    id: "turno-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    fecha: new Date("2026-04-10T00:00:00.000Z"),
    hora: "15:30",
    duracionMinutos: 45,
    estado: "CONFIRMADO",
    notas: "primera consulta",
    precio: decimal(15000),
    pagado: true,
    creadoEn: new Date("2026-04-01T00:00:00.000Z"),
  };

  it("convierte el precio de Decimal a number", () => {
    const datos = mapearTurno(
      base as unknown as Parameters<typeof mapearTurno>[0],
    ).aPrimitivos();

    expect(datos.precio).toBe(15000);
    expect(typeof datos.precio).toBe("number");
  });

  it("deja el precio en null cuando el turno no tiene cobro", () => {
    // null y 0 son distintos: "sin precio cargado" no es "gratis". Un `?? 0`
    // haria figurar el turno como cobrado en cero en las estadisticas.
    const datos = mapearTurno({
      ...base,
      precio: null,
      pagado: false,
    } as unknown as Parameters<typeof mapearTurno>[0]).aPrimitivos();

    expect(datos.precio).toBeNull();
    expect(datos.pagado).toBe(false);
  });

  it("copia hora, duracion y estado sin mezclarlos", () => {
    const datos = mapearTurno(
      base as unknown as Parameters<typeof mapearTurno>[0],
    ).aPrimitivos();

    expect(datos.hora).toBe("15:30");
    expect(datos.duracionMinutos).toBe(45);
    expect(datos.estado).toBe("CONFIRMADO");
    expect(datos.notas).toBe("primera consulta");
  });
});

describe("mapearSuplemento", () => {
  it("distingue dosis de frecuencia y desde de hasta", () => {
    const datos = mapearSuplemento({
      id: "sup-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      nombre: "Vitamina D",
      dosis: "2000 UI",
      frecuencia: "diaria",
      desde: new Date("2026-01-01T00:00:00.000Z"),
      hasta: new Date("2026-06-01T00:00:00.000Z"),
      activo: true,
      notas: "con la comida",
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearSuplemento>[0]).aPrimitivos();

    expect(datos.dosis).toBe("2000 UI");
    expect(datos.frecuencia).toBe("diaria");
    expect(datos.desde).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(datos.hasta).toEqual(new Date("2026-06-01T00:00:00.000Z"));
    expect(datos.activo).toBe(true);
  });
});

describe("mapearAlertaSeguimiento", () => {
  const fila = {
    id: "alerta-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    paciente: { nombre: "Ana", apellido: "Gomez" },
    tipo: "SIN_REGISTRO",
    estado: "PENDIENTE",
    detalle: "no registra hace 10 dias",
    referenciaId: "ref-1",
    datos: { dias: 10 },
    creadoEn: new Date("2026-05-01T00:00:00.000Z"),
    resueltaEn: null,
  } as unknown as Parameters<typeof mapearAlertaSeguimiento>[0];

  it("compone el nombre del paciente en el orden nombre-apellido", () => {
    // El mapeador CONSTRUYE un string que no existe en la base. Invertir el
    // orden no rompe nada tecnico y sale impreso en cada alerta.
    const datos = mapearAlertaSeguimiento(fila).aPrimitivos();

    expect(datos.pacienteNombre).toBe("Ana Gomez");
  });

  it("conserva el payload de datos como objeto", () => {
    const datos = mapearAlertaSeguimiento(fila).aPrimitivos();

    expect(datos.datos).toEqual({ dias: 10 });
    expect(datos.tipo).toBe("SIN_REGISTRO");
    expect(datos.estado).toBe("PENDIENTE");
    expect(datos.resueltaEn).toBeNull();
  });

  it("normaliza datos ausentes a null", () => {
    const sinDatos = mapearAlertaSeguimiento({
      ...fila,
      datos: null,
    }).aPrimitivos();

    expect(sinDatos.datos).toBeNull();
  });
});

describe("mapearCompetencia", () => {
  it("distingue objetivo de resultado", () => {
    // Dos strings que cuentan historias opuestas: lo que se buscaba y lo que
    // paso. Cruzarlos reescribe el historial deportivo del paciente.
    const datos = mapearCompetencia({
      id: "comp-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      nombre: "Maraton de Buenos Aires",
      fecha: new Date("2026-09-20T00:00:00.000Z"),
      lugar: "Buenos Aires",
      objetivo: "bajar de 3h30",
      resultado: "3h42",
      importancia: "ALTA",
      notas: "calor",
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearCompetencia>[0]).aPrimitivos();

    expect(datos.objetivo).toBe("bajar de 3h30");
    expect(datos.resultado).toBe("3h42");
    expect(datos.lugar).toBe("Buenos Aires");
    expect(datos.importancia).toBe("ALTA");
  });
});

describe("mapearPerfilDeportivo", () => {
  it("no cruza horasSemana con pesoCategoriaKg", () => {
    // Los dos unicos Decimal del perfil. Sin test, cruzarlos pone "75 horas
    // semanales" y "12 kg de categoria" sin que nada falle.
    const datos = mapearPerfilDeportivo({
      id: "perf-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      deporte: "Judo",
      disciplina: "-73kg",
      nivel: "COMPETITIVO",
      fase: "PRECOMPETENCIA",
      diasEntrenamientoSemana: 5,
      horasSemana: decimal(12),
      pesoCategoriaKg: decimal(73),
      posicion: null,
      objetivo: "mantener categoria",
      notas: null,
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as Parameters<typeof mapearPerfilDeportivo>[0]).aPrimitivos();

    expect(datos.horasSemana).toBe(12);
    expect(datos.pesoCategoriaKg).toBe(73);
    expect(datos.diasEntrenamientoSemana).toBe(5);
    expect(datos.nivel).toBe("COMPETITIVO");
    expect(datos.fase).toBe("PRECOMPETENCIA");
  });
});

describe("mapearObjetivo", () => {
  it("mapea las estrategias anidadas conservando su estado propio", () => {
    const datos = mapearObjetivo({
      id: "obj-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      objetivoComposicionId: "objcomp-1",
      titulo: "Mejorar adherencia",
      descripcion: "registrar todos los dias",
      prioridad: 1,
      estado: "EN_CURSO",
      fechaObjetivo: new Date("2026-08-01T00:00:00.000Z"),
      creadoEn: new Date("2026-01-01T00:00:00.000Z"),
      actualizadoEn: new Date("2026-01-01T00:00:00.000Z"),
      estrategias: [
        {
          id: "estr-1",
          descripcion: "recordatorio diario",
          motivo: "olvida cargar",
          estado: "ACTIVA",
          creadoEn: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    } as unknown as Parameters<typeof mapearObjetivo>[0]).aPrimitivos();

    expect(datos.titulo).toBe("Mejorar adherencia");
    expect(datos.estado).toBe("EN_CURSO");
    expect(datos.estrategias).toHaveLength(1);
    // La estrategia tiene su propio `estado`, distinto del objetivo.
    expect(datos.estrategias[0]!.estado).toBe("ACTIVA");
    expect(datos.estrategias[0]!.descripcion).toBe("recordatorio diario");
    expect(datos.estrategias[0]!.motivo).toBe("olvida cargar");
  });
});

describe("mapearRegistroDiario", () => {
  const fila = {
    id: "reg-1",
    nutricionistaId: "nutri-1",
    pacienteId: "pac-1",
    fecha: new Date("2026-03-15T00:00:00.000Z"),
    pesoKg: decimal(68.4),
    aguaMl: 1800,
    horasSueno: decimal(7.5),
    calidadSueno: "BUENA",
    notas: "dia tranquilo",
    creadoEn: new Date("2026-03-15T22:00:00.000Z"),
    actualizadoEn: new Date("2026-03-15T22:00:00.000Z"),
    comidas: [
      {
        id: "com-1",
        franja: "ALMUERZO",
        hora: "13:00",
        descripcion: "pollo con arroz",
        porcion: "1 plato",
        foto: { id: "foto-1" },
        creadoEn: new Date("2026-03-15T13:05:00.000Z"),
      },
      {
        id: "com-2",
        franja: "CENA",
        hora: "21:00",
        descripcion: "sopa",
        porcion: "1 tazon",
        foto: null,
        creadoEn: new Date("2026-03-15T21:05:00.000Z"),
      },
    ],
    actividades: [
      {
        id: "act-1",
        tipo: "CAMINATA",
        duracionMinutos: 40,
        intensidad: "MODERADA",
        notas: "por el parque",
        creadoEn: new Date("2026-03-15T18:00:00.000Z"),
      },
    ],
  } as unknown as Parameters<typeof mapearRegistroDiario>[0];

  it("no cruza pesoKg con horasSueno ni con aguaMl", () => {
    // Tres numeros de escalas distintas (68.4 / 1800 / 7.5). Un cruce da
    // valores absurdos que igual pasan el tipo.
    const datos = mapearRegistroDiario(fila).aPrimitivos();

    expect(datos.pesoKg).toBe(68.4);
    expect(datos.aguaMl).toBe(1800);
    expect(datos.horasSueno).toBe(7.5);
    expect(datos.calidadSueno).toBe("BUENA");
  });

  it("aplana la foto de la comida a su id, y a null si no hay", () => {
    const datos = mapearRegistroDiario(fila).aPrimitivos();

    expect(datos.comidas[0]!.fotoArchivoId).toBe("foto-1");
    expect(datos.comidas[1]!.fotoArchivoId).toBeNull();
  });

  it("mantiene comidas y actividades como colecciones separadas", () => {
    const datos = mapearRegistroDiario(fila).aPrimitivos();

    expect(datos.comidas).toHaveLength(2);
    expect(datos.actividades).toHaveLength(1);
    expect(datos.comidas[0]!.franja).toBe("ALMUERZO");
    expect(datos.actividades[0]!.tipo).toBe("CAMINATA");
    expect(datos.actividades[0]!.duracionMinutos).toBe(40);
    expect(datos.actividades[0]!.intensidad).toBe("MODERADA");
  });
});

describe("mapearMetricaDispositivo", () => {
  it("no cruza las cuatro metricas enteras entre si", () => {
    // pasos, minutosActividad, caloriasActivas y frecuenciaCardiacaReposo son
    // los cuatro `number | null`. Valores unicos para que un cruce falle.
    const datos = mapearMetricaDispositivo({
      id: "met-1",
      nutricionistaId: "nutri-1",
      pacienteId: "pac-1",
      fecha: new Date("2026-03-15T00:00:00.000Z"),
      fuente: "GOOGLE_FIT",
      pasos: 8500,
      minutosActividad: 55,
      caloriasActivas: 420,
      frecuenciaCardiacaReposo: 58,
      horasSueno: decimal(7.5),
      incluir: true,
      creadoEn: new Date("2026-03-16T00:00:00.000Z"),
      actualizadoEn: new Date("2026-03-16T00:00:00.000Z"),
    } as unknown as Parameters<
      typeof mapearMetricaDispositivo
    >[0]).aPrimitivos();

    expect(datos.pasos).toBe(8500);
    expect(datos.minutosActividad).toBe(55);
    expect(datos.caloriasActivas).toBe(420);
    expect(datos.frecuenciaCardiacaReposo).toBe(58);
    // El unico Decimal de la fila: tiene que salir como number.
    expect(datos.horasSueno).toBe(7.5);
    expect(typeof datos.horasSueno).toBe("number");
    expect(datos.fuente).toBe("GOOGLE_FIT");
    expect(datos.incluir).toBe(true);
  });
});
