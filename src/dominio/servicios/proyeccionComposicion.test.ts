import { describe, it, expect } from "vitest";
import {
  proyectarObjetivo,
  proyectarPlieguesParaMeta,
  admiteProyeccionDePliegues,
  type PuntoSerie,
} from "./proyeccionComposicion";
import {
  calcularComposicion,
  type ContextoComposicion,
  type MedidasComposicion,
} from "./composicionCorporal";

const HOY = new Date("2026-03-01T00:00:00Z");

/** Serie de masa adiposa bajando 0,5 kg por semana durante 4 semanas. */
const BAJANDO: PuntoSerie[] = [
  { fecha: new Date("2026-02-01T00:00:00Z"), valor: 20 },
  { fecha: new Date("2026-02-08T00:00:00Z"), valor: 19.5 },
  { fecha: new Date("2026-02-15T00:00:00Z"), valor: 19 },
  { fecha: new Date("2026-02-22T00:00:00Z"), valor: 18.5 },
];

describe("proyectarObjetivo — punto de partida", () => {
  /**
   * El progreso se mide desde que se planteó la meta, no desde la primera
   * medición del paciente. Con historia previa, tomar el punto más viejo
   * regala (o descuenta) un avance que ocurrió antes de que la meta existiera.
   */
  const HISTORIA: PuntoSerie[] = [
    { fecha: new Date("2025-01-01T00:00:00Z"), valor: 30 },
    { fecha: new Date("2025-06-01T00:00:00Z"), valor: 24 },
    // El objetivo se plantea acá, con el paciente en 20 kg.
    { fecha: new Date("2026-02-01T00:00:00Z"), valor: 20 },
    { fecha: new Date("2026-02-22T00:00:00Z"), valor: 18.5 },
  ];
  const CREADO = new Date("2026-02-05T00:00:00Z");

  it("parte de la medición vigente al crear el objetivo", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: CREADO,
      },
      HISTORIA,
      HOY,
    );

    expect(p.valorInicial).toBe(20);
    expect(p.fechaInicial).toEqual(new Date("2026-02-01T00:00:00Z"));
  });

  it("no cuenta como progreso lo que bajó antes de plantear la meta", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: CREADO,
      },
      HISTORIA,
      HOY,
    );

    // De 20 a 15 hay 5 kg; desde que se planteó bajó 1,5 → 30 %.
    // Tomando la primera medición (30 kg) daría 76,7 %: casi cumplido sin
    // haber hecho nada desde que se acordó la meta.
    expect(p.progresoPorcentaje).toBeCloseTo(30, 1);
  });

  it("el ritmo se estima solo con las mediciones posteriores a la meta", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: CREADO,
      },
      HISTORIA,
      HOY,
    );

    // 20 → 18,5 en 3 semanas = −0,5/semana. Con la historia entera la
    // pendiente se aplanaría por los años previos.
    expect(p.ritmoSemanal).toBeCloseTo(-0.5, 2);
  });

  it("si la meta es anterior a toda medición, parte de la primera", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: new Date("2024-01-01T00:00:00Z"),
      },
      HISTORIA,
      HOY,
    );

    expect(p.valorInicial).toBe(30);
  });

  it("la medición de partida ancla la regresión: con una posterior ya hay ritmo", () => {
    // Meta planteada entre la 3ª y la 4ª medición: quedan dos puntos (la
    // partida y la siguiente), que alcanzan para estimar la pendiente.
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: new Date("2026-02-10T00:00:00Z"),
      },
      HISTORIA,
      HOY,
    );

    expect(p.valorInicial).toBe(20);
    expect(p.valorActual).toBe(18.5);
    expect(p.brecha).toBe(-3.5);
    expect(p.ritmoSemanal).toBeCloseTo(-0.5, 2);
  });

  it("con dos mediciones previas estima el ritmo y lo marca como previo", () => {
    // El caso más común en consulta: el paciente ya tiene mediciones y la
    // meta se plantea hoy. No hay nada medido DESPUÉS de la meta, pero el
    // ritmo con el que viene se conoce y es lo que interesa proyectar.
    const dos: PuntoSerie[] = [
      { fecha: new Date("2026-02-01T00:00:00Z"), valor: 20 },
      { fecha: new Date("2026-02-22T00:00:00Z"), valor: 18.5 },
    ];
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: new Date("2026-03-01T00:00:00Z"),
      },
      dos,
      HOY,
    );

    expect(p.ritmoSemanal).toBeCloseTo(-0.5, 2);
    expect(p.ritmoPrevioALaMeta).toBe(true);
    expect(p.estado).toBe("EN_CAMINO");
    // El progreso sigue contándose desde la meta: todavía no arrancó.
    expect(p.valorInicial).toBe(18.5);
    expect(p.progresoPorcentaje).toBe(0);
  });

  it("el ritmo previo no arrastra años viejos: usa las últimas mediciones", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: new Date("2026-03-01T00:00:00Z"),
      },
      HISTORIA,
      HOY,
    );

    // Con toda la historia (2025 incluido) la pendiente daría ~−0,17.
    // Con las últimas tres mediciones refleja la tendencia reciente.
    expect(p.ritmoPrevioALaMeta).toBe(true);
    expect(p.ritmoSemanal!).toBeLessThan(-0.2);
  });

  it("con mediciones posteriores a la meta el ritmo NO es previo", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: CREADO,
      },
      HISTORIA,
      HOY,
    );

    expect(p.ritmoPrevioALaMeta).toBe(false);
    expect(p.ritmoSemanal).toBeCloseTo(-0.5, 2);
  });

  it("con una sola medición en total no hay ritmo que estimar", () => {
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: null,
        creadoEn: new Date("2026-03-01T00:00:00Z"),
      },
      [{ fecha: new Date("2026-02-22T00:00:00Z"), valor: 18.5 }],
      HOY,
    );

    expect(p.valorInicial).toBe(18.5);
    expect(p.brecha).toBe(-3.5);
    expect(p.ritmoSemanal).toBeNull();
    expect(p.estado).toBe("SIN_DATOS");
  });

  it("el estado se evalúa contra la ÚLTIMA medición, no contra la partida", () => {
    // Ya pasó la meta en la última medición: está alcanzada aunque la partida
    // estuviera lejos.
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 19,
        fechaObjetivo: null,
        creadoEn: CREADO,
      },
      HISTORIA,
      HOY,
    );

    expect(p.valorActual).toBe(18.5);
    expect(p.estado).toBe("ALCANZADO");
  });
});

describe("proyectarObjetivo", () => {
  it("sin mediciones no proyecta nada", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      [],
      HOY,
    );
    expect(p.estado).toBe("SIN_DATOS");
    expect(p.valorActual).toBeNull();
    expect(p.ritmoSemanal).toBeNull();
  });

  it("con una sola medición informa la brecha pero no el ritmo", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      [BAJANDO[0]!],
      HOY,
    );
    expect(p.valorActual).toBe(20);
    expect(p.brecha).toBe(-5);
    expect(p.ritmoSemanal).toBeNull();
    expect(p.estado).toBe("SIN_DATOS");
  });

  it("estima el ritmo semanal por regresión sobre toda la serie", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    expect(p.ritmoSemanal).toBeCloseTo(-0.5, 3);
    expect(p.valorInicial).toBe(20);
    expect(p.valorActual).toBe(18.5);
    expect(p.brecha).toBe(-3.5);
    expect(p.estado).toBe("EN_CAMINO");
  });

  it("amortigua una medición fuera de línea en vez de seguirla", () => {
    // Un pico aislado en la última consulta (paciente recién comido).
    const conPico: PuntoSerie[] = [
      ...BAJANDO.slice(0, 3),
      { fecha: new Date("2026-02-22T00:00:00Z"), valor: 20.5 },
    ];
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      conPico,
      HOY,
    );
    // Restar extremos daría +0,167 kg/semana; la regresión, que ve las cuatro
    // mediciones, se queda en +0,1: el pico pesa, pero no manda.
    expect(p.ritmoSemanal).toBeCloseTo(0.1, 2);
    expect(Math.abs(p.ritmoSemanal!)).toBeLessThan(0.167);
  });

  it("calcula el progreso como fracción del camino recorrido", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    // De 20 a 15 hay 5 kg; ya bajó 1,5 → 30 %.
    expect(p.progresoPorcentaje).toBeCloseTo(30, 1);
  });

  it("marca ALCANZADO cuando se llegó al valor objetivo", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 18.5, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    expect(p.estado).toBe("ALCANZADO");
    expect(p.progresoPorcentaje).toBe(100);
  });

  it("marca ALCANZADO también si se pasó de largo en la dirección buscada", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 19, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    expect(p.estado).toBe("ALCANZADO");
  });

  it("marca ALEJANDOSE cuando la variable se mueve al revés", () => {
    const subiendo: PuntoSerie[] = BAJANDO.map((punto, i) => ({
      fecha: punto.fecha,
      valor: 18.5 + i * 0.5,
    }));
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      subiendo,
      HOY,
    );
    expect(p.ritmoSemanal).toBeGreaterThan(0);
    expect(p.estado).toBe("ALEJANDOSE");
  });

  describe("con fecha objetivo", () => {
    it("EN_CAMINO si el ritmo actual alcanza para llegar", () => {
      // Faltan 3,5 kg en ~10 semanas → hace falta −0,35/semana; viene a −0,5.
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-05-10T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.ritmoSemanalNecesario).toBeCloseTo(-0.35, 1);
      expect(p.estado).toBe("EN_CAMINO");
    });

    it("ATRASADO si va en la dirección correcta pero demasiado lento", () => {
      // Faltan 3,5 kg en ~4 semanas → hace falta −0,875/semana; viene a −0,5.
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-03-29T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.estado).toBe("ATRASADO");
    });

    it("marca VENCIDO cuando la fecha ya pasó sin alcanzar la meta", () => {
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-02-20T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.estado).toBe("VENCIDO");
      // Sin semanas por delante no hay ritmo necesario que pedir.
      expect(p.ritmoSemanalNecesario).toBeNull();
    });

    it("una fecha vencida no pisa a un objetivo ya alcanzado", () => {
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 18.5,
          fechaObjetivo: new Date("2026-02-20T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.estado).toBe("ALCANZADO");
    });

    it("proyecta la fecha de llegada y el valor esperado a la fecha meta", () => {
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-05-10T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      // 3,5 kg a 0,5 kg/semana = 7 semanas desde el 22/02 → 12/04.
      expect(p.fechaProyectada!.toISOString().slice(0, 10)).toBe("2026-04-12");
      // A 11 semanas del 22/02 habría bajado 5,5 kg más: 18,5 − 5,5 = 13.
      expect(p.valorProyectadoAFecha).toBeCloseTo(13, 1);
    });
  });

  it("no proyecta un valor imposible al extrapolar muy lejos", () => {
    // A −0,5 kg/semana durante casi dos años, la recta cruza el cero. Un valor
    // negativo de masa adiposa no significa nada: mejor no dar proyección.
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: new Date("2027-12-01T00:00:00Z"),
      },
      BAJANDO,
      HOY,
    );

    expect(p.valorProyectadoAFecha).toBeNull();
    // La fecha estimada de llegada sí se mantiene: esa sí es alcanzable.
    expect(p.fechaProyectada).not.toBeNull();
  });

  it("no proyecta fecha si el paciente está estancado", () => {
    const plano: PuntoSerie[] = BAJANDO.map((punto) => ({
      fecha: punto.fecha,
      valor: 20,
    }));
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      plano,
      HOY,
    );
    expect(p.ritmoSemanal).toBe(0);
    expect(p.fechaProyectada).toBeNull();
    expect(p.estado).toBe("ALEJANDOSE");
  });

  it("ignora el orden en el que llegan los puntos", () => {
    const desordenada = [...BAJANDO].reverse();
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      desordenada,
      HOY,
    );
    expect(p.valorInicial).toBe(20);
    expect(p.valorActual).toBe(18.5);
  });

  it("no proyecta fecha cuando todas las mediciones son del mismo día", () => {
    const mismoDia: PuntoSerie[] = [
      { fecha: new Date("2026-02-01T00:00:00Z"), valor: 20 },
      { fecha: new Date("2026-02-01T00:00:00Z"), valor: 19 },
    ];
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      mismoDia,
      HOY,
    );
    expect(p.ritmoSemanal).toBeNull();
    expect(p.estado).toBe("SIN_DATOS");
  });

  it("lleva la etiqueta y la unidad de la variable", () => {
    const p = proyectarObjetivo(
      {
        variable: "INDICE_CINTURA_CADERA",
        valorObjetivo: 0.85,
        fechaObjetivo: null,
      },
      [],
      HOY,
    );
    expect(p.etiqueta).toBe("Índice cintura/cadera");
    expect(p.unidad).toBe("");
  });
});

// --- Pliegues proyectados -------------------------------------------------------

/** Perfil ISAK completo: permite tanto Kerr como las ecuaciones de pliegues. */
const MEDIDAS: MedidasComposicion = {
  pesoKg: 88.4,
  tallaCm: 193,
  tallaSentadoCm: 97,
  diamBiacromial: 45.4,
  diamToraxTransverso: 32,
  diamToraxAnteroposterior: 20,
  diamBiiliocrestideo: 31.5,
  diamHumeral: 7.8,
  diamFemoral: 10.6,
  circCabeza: 56.5,
  circBrazo: 30,
  circBrazoContraido: 32,
  circAntebrazo: 29,
  circTorax: 100,
  circCinturaMinima: 84,
  circCadera: 102,
  circMusloMaximo: 62,
  circMusloMedial: 58,
  circPantorrilla: 40.5,
  pliegueTricipital: 10,
  pliegueSubescapular: 12,
  pliegueSupraespinal: 8,
  pliegueAbdominal: 15,
  pliegueMuslo: 14,
  plieguePantorrilla: 9,
  pliegueBicipital: 6,
  pliegueCrestaIliaca: 11,
};

const CONTEXTO: ContextoComposicion = {
  sexo: "MASCULINO",
  edadAnios: 30,
  nivelActividad: "MODERADA",
};

/** Aplica la proyección y recalcula: el valor tiene que dar la meta. */
function valorTrasAplicar(
  proyeccion: NonNullable<ReturnType<typeof proyectarPlieguesParaMeta>>,
  extraer: (r: ReturnType<typeof calcularComposicion>) => number | null,
): number | null {
  const aplicadas: MedidasComposicion = { ...MEDIDAS };
  for (const pliegue of proyeccion.pliegues) {
    aplicadas[pliegue.campo] = pliegue.objetivoMm;
  }
  return extraer(calcularComposicion(aplicadas, CONTEXTO));
}

describe("proyectarPlieguesParaMeta", () => {
  it("solo las metas de adiposidad definen pliegues", () => {
    expect(admiteProyeccionDePliegues("MASA_ADIPOSA_KG")).toBe(true);
    expect(admiteProyeccionDePliegues("PORCENTAJE_GRASA")).toBe(true);
    expect(admiteProyeccionDePliegues("SUMATORIA_6_PLIEGUES")).toBe(true);
    // El peso no depende de los pliegues y el músculo sube entrenando, no
    // adelgazando el pliegue: proyectarlos ahí induciría a error.
    expect(admiteProyeccionDePliegues("PESO")).toBe(false);
    expect(admiteProyeccionDePliegues("MASA_MUSCULAR_KG")).toBe(false);
    expect(admiteProyeccionDePliegues("IMC")).toBe(false);
  });

  it("no proyecta para una meta de peso", () => {
    expect(
      proyectarPlieguesParaMeta(
        { variable: "PESO", metodoGrasa: null, valorObjetivo: 80 },
        MEDIDAS,
        CONTEXTO,
      ),
    ).toBeNull();
  });

  describe("meta del fraccionamiento de Kerr", () => {
    /**
     * La masa adiposa de Kerr se prorratea contra el peso bruto, así que no
     * tiene inversa cerrada. Lo que verifica este test es lo único que
     * importa: aplicar los pliegues proyectados y recalcular TODO el modelo
     * da el valor pedido.
     */
    it("los pliegues proyectados dan la masa adiposa buscada", () => {
      const p = proyectarPlieguesParaMeta(
        { variable: "MASA_ADIPOSA_KG", metodoGrasa: null, valorObjetivo: 14 },
        MEDIDAS,
        CONTEXTO,
      )!;

      expect(
        valorTrasAplicar(p, (r) => r.fraccionamiento?.adiposa.kg ?? null),
      ).toBeCloseTo(14, 1);
    });

    it("también con la masa adiposa en porcentaje", () => {
      const p = proyectarPlieguesParaMeta(
        {
          variable: "MASA_ADIPOSA_PORCENTAJE",
          metodoGrasa: null,
          valorObjetivo: 16,
        },
        MEDIDAS,
        CONTEXTO,
      )!;

      expect(
        valorTrasAplicar(
          p,
          (r) => r.fraccionamiento?.adiposa.porcentaje ?? null,
        ),
      ).toBeCloseTo(16, 1);
    });

    it("usa los 6 pliegues del perfil cuando la meta no tiene ecuación", () => {
      const p = proyectarPlieguesParaMeta(
        { variable: "MASA_ADIPOSA_KG", metodoGrasa: null, valorObjetivo: 14 },
        MEDIDAS,
        CONTEXTO,
      )!;

      expect(p.pliegues).toHaveLength(6);
      expect(p.metodo).toBeNull();
    });
  });

  describe("meta de una ecuación de pliegues", () => {
    it("los pliegues proyectados dan el porcentaje graso buscado", () => {
      const p = proyectarPlieguesParaMeta(
        {
          variable: "PORCENTAJE_GRASA",
          metodoGrasa: "YUHASZ_CARTER",
          valorObjetivo: 9,
        },
        MEDIDAS,
        CONTEXTO,
      )!;

      const obtenido = valorTrasAplicar(
        p,
        (r) =>
          r.grasaPorPliegues.resultados.find(
            (x) => x.metodo === "YUHASZ_CARTER",
          )?.porcentajeGrasa ?? null,
      );
      expect(obtenido).toBeCloseTo(9, 1);
    });

    it("escala solo los pliegues de esa ecuación", () => {
      const p = proyectarPlieguesParaMeta(
        {
          variable: "PORCENTAJE_GRASA",
          metodoGrasa: "FAULKNER",
          valorObjetivo: 10,
        },
        MEDIDAS,
        CONTEXTO,
      )!;

      expect(p.pliegues).toHaveLength(4);
      expect(p.metodo).toBe("FAULKNER");
    });
  });

  it("mantiene el reparto proporcional entre sitios", () => {
    const p = proyectarPlieguesParaMeta(
      {
        variable: "SUMATORIA_6_PLIEGUES",
        metodoGrasa: null,
        valorObjetivo: 34,
      },
      MEDIDAS,
      CONTEXTO,
    )!;

    expect(p.sumaObjetivoMm).toBeCloseTo(34, 0);
    // Σ6 actual = 68 → factor 0,5: cada pliegue a la mitad.
    expect(p.pliegues[0]!.objetivoMm).toBeCloseTo(5, 1);
    expect(p.pliegues[3]!.objetivoMm).toBeCloseTo(7.5, 1);
  });

  it("avisa si la meta deja pliegues por debajo de lo medible", () => {
    const p = proyectarPlieguesParaMeta(
      { variable: "SUMATORIA_6_PLIEGUES", metodoGrasa: null, valorObjetivo: 8 },
      MEDIDAS,
      CONTEXTO,
    )!;
    expect(p.fueraDeRango).toBe(true);
  });

  it("no inventa una proyección si la meta es inalcanzable con pliegues", () => {
    // Ni bajando los pliegues a la nada se llega a 1 kg de masa adiposa.
    expect(
      proyectarPlieguesParaMeta(
        { variable: "MASA_ADIPOSA_KG", metodoGrasa: null, valorObjetivo: 1 },
        MEDIDAS,
        CONTEXTO,
      ),
    ).toBeNull();
  });

  it("sin sexo no hay fraccionamiento y no se puede proyectar Kerr", () => {
    expect(
      proyectarPlieguesParaMeta(
        { variable: "MASA_ADIPOSA_KG", metodoGrasa: null, valorObjetivo: 14 },
        MEDIDAS,
        { ...CONTEXTO, sexo: null },
      ),
    ).toBeNull();
  });
});
