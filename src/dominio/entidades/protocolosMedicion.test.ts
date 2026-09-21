import { describe, it, expect } from "vitest";
import {
  CAMPOS_PROTOCOLO_POR_DEFECTO,
  camposDeProtocoloValidados,
  faltaParaElProtocolo,
  protocoloSegunMedidas,
  protocolosQueAdmite,
} from "./protocolosMedicion";
import { PLANTILLAS_BASE } from "./plantillasBase";
import {
  REQUERIDOS_CINCO_MASAS,
  alcanceDe,
  estadoDeResultados,
  type CampoPlantilla,
} from "./PlantillaAntropometrica";
import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Quita campos de una lista sin tocar el resto. */
function sin(
  campos: readonly CampoPlantilla[],
  ...quitar: CampoPlantilla[]
): CampoPlantilla[] {
  return campos.filter((campo) => !quitar.includes(campo));
}

describe("CAMPOS_PROTOCOLO_POR_DEFECTO", () => {
  it("los dos juegos de fábrica se aceptan como su propio protocolo", () => {
    expect(() =>
      camposDeProtocoloValidados(
        "DOS_COMPONENTES",
        CAMPOS_PROTOCOLO_POR_DEFECTO.DOS_COMPONENTES,
      ),
    ).not.toThrow();
    expect(() =>
      camposDeProtocoloValidados(
        "CINCO_COMPONENTES",
        CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES,
      ),
    ).not.toThrow();
  });

  it("el de 5 componentes resuelve el fraccionamiento y el somatotipo", () => {
    // Es su razón de ser: si el juego por defecto no lo resolviera, el
    // protocolo arrancaría sin poder arrojar lo único que lo distingue.
    const alcance = alcanceDe(CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES);

    expect(alcance.cincoMasas).toBe(true);
    expect(alcance.somatotipo).toBe(true);
  });

  it("el de 2 componentes pide solo los pliegues de las ecuaciones, 3 perímetros y la talla", () => {
    // La carga de todos los días: lo mínimo para lo que ESE protocolo
    // contesta. Los diámetros y los demás perímetros solo sirven para el
    // fraccionamiento, que acá no se calcula.
    expect(CAMPOS_PROTOCOLO_POR_DEFECTO.DOS_COMPONENTES).toEqual([
      "tallaCm",
      "circCinturaMinima",
      "circCinturaMaxima",
      "circCadera",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
      "pliegueMuslo",
      "plieguePantorrilla",
      "pliegueBicipital",
      "pliegueCrestaIliaca",
    ]);
  });

  it("los pliegues del de 2 componentes son los que alimentan alguna ecuación", () => {
    // Se derivan de la tabla de requisitos: el bicipital y la cresta ilíaca
    // entran porque sin ellos Durnin & Womersley no sale nunca y Withers solo
    // sale en mujeres. El axilar medio y el lumbar no alimentan ninguna.
    const pliegues = CAMPOS_PROTOCOLO_POR_DEFECTO.DOS_COMPONENTES.filter((c) =>
      c.startsWith("pliegue"),
    );
    const alcance = alcanceDe(CAMPOS_PROTOCOLO_POR_DEFECTO.DOS_COMPONENTES);

    expect(pliegues).toHaveLength(8);
    expect(alcance.metodosGrasa.map((m) => m.metodo)).toHaveLength(6);
    expect(alcance.metodosGrasa.every((m) => m.sexo === "AMBOS")).toBe(true);
  });

  it("el de 2 componentes no pide diámetros: son del fraccionamiento", () => {
    expect(
      CAMPOS_PROTOCOLO_POR_DEFECTO.DOS_COMPONENTES.filter((c) =>
        c.startsWith("diam"),
      ),
    ).toEqual([]);
    expect(
      CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES.filter((c) =>
        c.startsWith("diam"),
      ),
    ).toHaveLength(6);
  });

  it("ninguno de los dos pide los sitios de fuera del ISAK", () => {
    for (const juego of Object.values(CAMPOS_PROTOCOLO_POR_DEFECTO)) {
      expect(juego).not.toContain("pliegueAxilarMedio");
      expect(juego).not.toContain("pliegueLumbar");
    }
  });
});

describe("faltaParaElProtocolo — 5 componentes", () => {
  it("deja sacar una medida que el fraccionamiento no usa", () => {
    // La cintura máxima se anota por seguimiento clínico y ningún modelo la
    // usa: sacarla acorta la carga sin costo.
    const campos = sin(
      CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES,
      "circCinturaMaxima",
      "circCadera",
    );

    expect(faltaParaElProtocolo("CINCO_COMPONENTES", campos)).toEqual([]);
    expect(alcanceDe(campos).cincoMasas).toBe(true);
  });

  it("no deja sacar una medida del fraccionamiento de Kerr", () => {
    const campos = sin(
      CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES,
      "circCabeza",
    );

    expect(faltaParaElProtocolo("CINCO_COMPONENTES", campos)).toEqual([
      "Perímetro de cabeza",
    ]);
    expect(() =>
      camposDeProtocoloValidados("CINCO_COMPONENTES", campos),
    ).toThrow(ErrorValidacion);
  });

  it("exige las 21 medidas de Kerr, ni una menos", () => {
    for (const requerido of REQUERIDOS_CINCO_MASAS) {
      const campos = sin(
        CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES,
        requerido,
      );
      expect(
        faltaParaElProtocolo("CINCO_COMPONENTES", campos),
        `sacar ${requerido} tendría que romper el protocolo`,
      ).toHaveLength(1);
    }
  });
});

describe("faltaParaElProtocolo — 2 componentes", () => {
  it("deja podar hasta los 4 pliegues de Faulkner", () => {
    const campos: CampoPlantilla[] = [
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
    ];

    expect(faltaParaElProtocolo("DOS_COMPONENTES", campos)).toEqual([]);
    expect(alcanceDe(campos).metodosGrasa.length).toBeGreaterThan(0);
  });

  it("no deja quedarse sin ninguna ecuación de grasa, y dice cuál falta", () => {
    const campos: CampoPlantilla[] = [
      "pliegueTricipital",
      "pliegueSubescapular",
      "circCadera",
    ];

    expect(faltaParaElProtocolo("DOS_COMPONENTES", campos)).toEqual([
      "Pliegue supraespinal",
      "Pliegue abdominal",
    ]);
    expect(() => camposDeProtocoloValidados("DOS_COMPONENTES", campos)).toThrow(
      ErrorValidacion,
    );
  });

  it("los dos protocolos tienen pisos distintos, no uno solo", () => {
    // Los 4 de Faulkner alcanzan de sobra para 2 componentes y no llegan ni
    // cerca para 5: es lo que hace que la personalización sea por protocolo y
    // no una única regla para los dos.
    const faulkner: CampoPlantilla[] = [
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
    ];

    expect(faltaParaElProtocolo("DOS_COMPONENTES", faulkner)).toEqual([]);
    expect(
      faltaParaElProtocolo("CINCO_COMPONENTES", faulkner).length,
    ).toBeGreaterThan(10);
  });
});

describe("camposDeProtocoloValidados", () => {
  it("normaliza al orden ISAK y descarta duplicados y desconocidos", () => {
    const campos = camposDeProtocoloValidados("DOS_COMPONENTES", [
      "pliegueAbdominal",
      "pliegueTricipital",
      "pliegueTricipital",
      "inventado",
      "pliegueSupraespinal",
      "pliegueSubescapular",
    ]);

    expect(campos).toEqual([
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
    ]);
  });

  it("el error nombra las medidas que faltan, no un «elegí más campos»", () => {
    try {
      camposDeProtocoloValidados("CINCO_COMPONENTES", [
        "pliegueTricipital",
        "pliegueSubescapular",
        "pliegueSupraespinal",
        "pliegueAbdominal",
      ]);
      throw new Error("tendría que haber fallado");
    } catch (error) {
      expect((error as Error).message).toContain("diámetro humeral");
      expect((error as Error).message).toContain("talla sentado");
    }
  });
});

describe("protocolosQueAdmite", () => {
  it("la plantilla de 6 pliegues sirve para 2 componentes y no para 5", () => {
    // Es el caso que motivó la regla: cargar con ella bajo el protocolo de 5
    // componentes daría una medición sin el fraccionamiento, que es lo único
    // que ese protocolo viene a contestar.
    const seis = PLANTILLAS_BASE.find((p) => p.clave === "SEIS_PLIEGUES")!;

    expect(protocolosQueAdmite(seis.campos)).toEqual(["DOS_COMPONENTES"]);
  });

  it("el perfil ISAK completo sirve para los dos", () => {
    const isak = PLANTILLAS_BASE.find((p) => p.clave === "ISAK_COMPLETO")!;

    expect(protocolosQueAdmite(isak.campos)).toEqual([
      "CINCO_COMPONENTES",
      "DOS_COMPONENTES",
    ]);
  });

  it("toda plantilla de fábrica admite al menos un protocolo", () => {
    // Una plantilla que no se pudiera usar con ninguno sería inofrecible: se
    // guardaría bien y después no aparecería en ninguna carga.
    for (const base of PLANTILLAS_BASE) {
      expect(
        protocolosQueAdmite(base.campos),
        `«${base.nombre}» no sirve para ningún protocolo`,
      ).not.toHaveLength(0);
    }
  });

  it("usa el MISMO piso que la personalización del protocolo", () => {
    // Si una lista de campos no sirve para configurar un protocolo, tampoco
    // puede servir para cargar con él: dos reglas para lo mismo se separan
    // sin que nada falle.
    const casos: CampoPlantilla[][] = [
      [...CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES],
      sin(CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES, "circCabeza"),
      ["pliegueTricipital", "pliegueSubescapular"],
    ];

    for (const campos of casos) {
      const admitidos = protocolosQueAdmite(campos);
      expect(admitidos.includes("CINCO_COMPONENTES")).toBe(
        faltaParaElProtocolo("CINCO_COMPONENTES", campos).length === 0,
      );
      expect(admitidos.includes("DOS_COMPONENTES")).toBe(
        faltaParaElProtocolo("DOS_COMPONENTES", campos).length === 0,
      );
    }
  });
});

describe("protocoloSegunMedidas", () => {
  /** Una columna de planilla con valor en exactamente estos campos. */
  function columna(
    campos: readonly CampoPlantilla[],
  ): Partial<Record<CampoPlantilla, number>> {
    return Object.fromEntries(campos.map((campo) => [campo, 10]));
  }

  it("con las 21 medidas de Kerr la consulta entra como de 5 componentes", () => {
    expect(protocoloSegunMedidas(columna(REQUERIDOS_CINCO_MASAS))).toBe(
      "CINCO_COMPONENTES",
    );
  });

  it("si falta UNA medida del fraccionamiento, entra como de 2", () => {
    // No hay término medio: el protocolo de 5 componentes es el que promete el
    // fraccionamiento, y con 20 de 21 medidas no lo puede arrojar.
    for (const requerido of REQUERIDOS_CINCO_MASAS) {
      const medidas = columna(
        REQUERIDOS_CINCO_MASAS.filter((campo) => campo !== requerido),
      );
      expect(
        protocoloSegunMedidas(medidas),
        `sin ${requerido} tendría que caer en 2 componentes`,
      ).toBe("DOS_COMPONENTES");
    }
  });

  it("una columna de seguimiento típica entra como de 2 componentes", () => {
    const seis = PLANTILLAS_BASE.find((p) => p.clave === "SEIS_PLIEGUES")!;
    expect(protocoloSegunMedidas(columna(seis.campos))).toBe("DOS_COMPONENTES");
  });

  it("mira las medidas CARGADAS, no los campos pedidos", () => {
    // Un campo presente pero vacío no cuenta: lo que decide es lo que quedó
    // escrito en esa consulta, no lo que la planilla se proponía medir.
    const conUnHueco: Partial<Record<CampoPlantilla, number | null>> = {
      ...columna(REQUERIDOS_CINCO_MASAS),
      circCabeza: null,
    };

    expect(protocoloSegunMedidas(conUnHueco)).toBe("DOS_COMPONENTES");
  });
});

describe("estadoDeResultados", () => {
  it("dice qué se pierde y con qué medida se recupera", () => {
    // Es lo que el editor muestra mientras se destilda: sin el motivo, ver
    // desaparecer una ecuación no dice cuál campo volver a tildar.
    const conCresta = estadoDeResultados([
      "pliegueBicipital",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueCrestaIliaca",
    ]);
    expect(
      conCresta.find((e) => e.clave === "DURNIN_WOMERSLEY")?.cubierto,
    ).toBe(true);

    const sinCresta = estadoDeResultados([
      "pliegueBicipital",
      "pliegueTricipital",
      "pliegueSubescapular",
    ]);
    const durnin = sinCresta.find((e) => e.clave === "DURNIN_WOMERSLEY");
    expect(durnin?.cubierto).toBe(false);
    expect(durnin?.faltan).toEqual(["Pliegue de cresta ilíaca"]);
  });

  it("colapsa Withers en una línea y aclara para qué sexo sale", () => {
    const seisPliegues: CampoPlantilla[] = [
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
      "pliegueMuslo",
      "plieguePantorrilla",
    ];
    const withers = estadoDeResultados(seisPliegues).filter(
      (e) => e.clave === "WITHERS",
    );

    expect(withers).toHaveLength(1);
    expect(withers[0]!.cubierto).toBe(true);
    expect(withers[0]!.sexo).toBe("FEMENINO");
  });

  it("cuando no sale por ningún camino, lo que falta es el camino más corto", () => {
    // Withers tiene dos juegos (Σ7 en varones, Σ4 propia en mujeres): lo que
    // se informa es el del juego al que menos le falta.
    const withers = estadoDeResultados(["pliegueTricipital"]).find(
      (e) => e.clave === "WITHERS",
    );

    expect(withers?.cubierto).toBe(false);
    expect(withers?.faltan).toEqual([
      "Pliegue subescapular",
      "Pliegue supraespinal",
      "Pliegue de pantorrilla",
    ]);
  });
});
