import { describe, it, expect } from "vitest";
import {
  PlantillaWhatsapp,
  MAX_DIAS_ANTES_PLANTILLA,
  CUERPO_RECORDATORIO_POR_DEFECTO,
  type VariableRecordatorio,
} from "./PlantillaWhatsapp";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("PlantillaWhatsapp", () => {
  const base = {
    nombre: "Recordatorio",
    cuerpo: CUERPO_RECORDATORIO_POR_DEFECTO,
    claveMeta: null,
    idiomaMeta: "es_AR",
    variablesMeta: [],
    diasAntes: null,
    predeterminada: false,
    activa: true,
  };

  it("acepta un día null (sin asignar) y rechaza uno fuera de rango", () => {
    expect(PlantillaWhatsapp.crear(base, "x").diasAntes).toBeNull();
    expect(() =>
      PlantillaWhatsapp.crear(
        { ...base, diasAntes: MAX_DIAS_ANTES_PLANTILLA + 1 },
        "x",
      ),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaWhatsapp.crear({ ...base, diasAntes: -1 }, "x"),
    ).toThrow(ErrorValidacion);
  });

  it("liberarDia limpia el día asignado, y es un no-op si ya no tenía", () => {
    const sinDia = PlantillaWhatsapp.crear(base, "pla-1");
    expect(sinDia.liberarDia()).toBe(sinDia);

    const conDia = PlantillaWhatsapp.crear({ ...base, diasAntes: 3 }, "pla-2");
    expect(conDia.liberarDia().diasAntes).toBeNull();
  });
});

describe("PlantillaWhatsapp — plantillas de Meta con botones", () => {
  const base = {
    nombre: "Recordatorio",
    cuerpo: "Hola {{paciente}}, tu turno es el {{fecha}} a las {{hora}}.",
    claveMeta: "recordatorio_turno",
    idiomaMeta: "es_AR",
    variablesMeta: ["paciente", "fecha", "hora"] as VariableRecordatorio[],
    diasAntes: null,
    predeterminada: false,
    activa: true,
  };

  it("pone las respuestas rápidas antes que los enlaces: Meta rechaza los grupos mezclados", () => {
    const plantilla = PlantillaWhatsapp.crear(
      {
        ...base,
        botones: [
          {
            tipo: "URL",
            texto: "Confirmar online",
            destino: "CONFIRMACION_TURNO",
            url: null,
          },
          {
            tipo: "RESPUESTA_RAPIDA",
            texto: "Confirmo",
            accion: "CONFIRMAR_TURNO",
          },
        ],
      },
      "x",
    );

    expect(plantilla.botones.map((b) => b.tipo)).toEqual([
      "RESPUESTA_RAPIDA",
      "URL",
    ]);
  });

  it("rechaza un enlace fijo sin https, textos repetidos y dos botones de confirmar", () => {
    expect(() =>
      PlantillaWhatsapp.crear(
        {
          ...base,
          botones: [
            { tipo: "URL", texto: "Web", destino: "FIJA", url: "http://x.com" },
          ],
        },
        "x",
      ),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaWhatsapp.crear(
        {
          ...base,
          botones: [
            { tipo: "RESPUESTA_RAPIDA", texto: "Sí", accion: "NINGUNA" },
            { tipo: "RESPUESTA_RAPIDA", texto: "sí", accion: "NINGUNA" },
          ],
        },
        "x",
      ),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaWhatsapp.crear(
        {
          ...base,
          botones: [
            {
              tipo: "RESPUESTA_RAPIDA",
              texto: "Voy",
              accion: "CONFIRMAR_TURNO",
            },
            {
              tipo: "RESPUESTA_RAPIDA",
              texto: "Dale",
              accion: "CONFIRMAR_TURNO",
            },
          ],
        },
        "x",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("numera las variables en orden de aparición, como las espera Meta", () => {
    const plantilla = PlantillaWhatsapp.crear(base, "x");

    expect(plantilla.formatoMeta()).toEqual({
      texto: "Hola {{1}}, tu turno es el {{2}} a las {{3}}.",
      variables: ["paciente", "fecha", "hora"],
    });
  });

  it("no deja mandar a Meta un cuerpo que termina en una variable", () => {
    const plantilla = PlantillaWhatsapp.crear(
      {
        ...base,
        cuerpo: CUERPO_RECORDATORIO_POR_DEFECTO,
        variablesMeta: ["paciente", "fecha", "hora", "profesional"],
      },
      "x",
    );

    expect(() => plantilla.validarParaMeta()).toThrow(/empiece o termine/);
  });

  it("solo sale por la API aprobada; sin estado conocido se asume aprobada", () => {
    const vinculadaAMano = PlantillaWhatsapp.crear(base, "x");
    expect(vinculadaAMano.admiteEnvioPorApi).toBe(true);

    const enRevision = vinculadaAMano.registrarAltaEnMeta("m-1", "EN_REVISION");
    expect(enRevision.admiteEnvioPorApi).toBe(false);
    expect(
      enRevision.registrarEstadoMeta("APROBADA", null).admiteEnvioPorApi,
    ).toBe(true);
    expect(
      enRevision.registrarEstadoMeta("RECHAZADA", "Formato").admiteEnvioPorApi,
    ).toBe(false);
  });

  it("registrarEstadoMeta no crea otra instancia si nada cambió", () => {
    const aprobada = PlantillaWhatsapp.crear(base, "x").registrarAltaEnMeta(
      "m-1",
      "APROBADA",
    );
    expect(aprobada.registrarEstadoMeta("APROBADA", "  ")).toBe(aprobada);
  });

  it("una plantilla ya enviada a Meta no se puede renombrar allá", () => {
    const enviada = PlantillaWhatsapp.crear(base, "x").registrarAltaEnMeta(
      "m-1",
      "EN_REVISION",
    );

    expect(() => enviada.actualizar({ claveMeta: "otro_nombre" })).toThrow(
      ErrorValidacion,
    );
    // Lo que no es su identidad en Meta se edita igual.
    expect(enviada.actualizar({ nombre: "Otro nombre" }).nombre).toBe(
      "Otro nombre",
    );
  });

  it("necesita un turno si usa sus datos o tiene botones que actúan sobre él", () => {
    const soloPaciente = {
      ...base,
      cuerpo: "Hola {{paciente}}, ¿cómo venís?",
      variablesMeta: ["paciente"] as VariableRecordatorio[],
    };
    expect(PlantillaWhatsapp.crear(soloPaciente, "x").necesitaTurno).toBe(
      false,
    );
    expect(PlantillaWhatsapp.crear(base, "x").necesitaTurno).toBe(true);
    expect(
      PlantillaWhatsapp.crear(
        {
          ...soloPaciente,
          botones: [
            {
              tipo: "RESPUESTA_RAPIDA",
              texto: "Reprogramar",
              accion: "PEDIR_REPROGRAMACION",
            },
          ],
        },
        "x",
      ).necesitaTurno,
    ).toBe(true);
  });

  it("detecta si cambió lo que revisa Meta", () => {
    const original = PlantillaWhatsapp.crear(base, "x");
    expect(
      original
        .actualizar({ predeterminada: true })
        .contenidoMetaDistintoDe(original),
    ).toBe(false);
    expect(
      original
        .actualizar({
          botones: [
            { tipo: "RESPUESTA_RAPIDA", texto: "Ok", accion: "NINGUNA" },
          ],
        })
        .contenidoMetaDistintoDe(original),
    ).toBe(true);
  });
});
