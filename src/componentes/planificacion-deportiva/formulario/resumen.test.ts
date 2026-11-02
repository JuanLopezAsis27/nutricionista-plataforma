import { describe, it, expect } from "vitest";
import { PlanificacionDeportiva } from "@/dominio/entidades/PlanificacionDeportiva";
import {
  alimentoVacio,
  erroresDelFormulario,
  formularioVacio,
  duracionDesdeTexto,
  ingestaVacia,
  minutosDesdeTexto,
  paraGuardar,
  type AlimentoFormulario,
  type FormularioPlanificacion,
} from "./esquema";
import { horaDelDia, resumenEnVivo } from "./resumen";
import { horaDeIngesta } from "@/dominio/entidades/PlanificacionDeportiva";

/**
 * El resumen en vivo del formulario tiene que dar lo MISMO que el dominio.
 *
 * El profesional decide cuántos geles poner mirando los g/h del formulario, y
 * el paciente recibe los que calcula el servidor. Si las dos cuentas se
 * separan, nadie se entera. Este test arma la misma planificación de las dos
 * formas —con un gel medido en «unidad», una isotónica en ml y una ingesta
 * antes de largar— y compara el resumen entero.
 */

function gel(unidades: string): AlimentoFormulario {
  return {
    ...alimentoVacio(),
    nombre: "Gel",
    unidadBase: "GRAMO",
    medidas: [{ nombre: "unidad", cantidad: 40 }],
    medida: "unidad",
    cantidadMedida: unidades,
    cantidadPorMedida: "40",
    cantidadGramos: "",
    caloriasPor100: "250",
    proteinasPor100: "0",
    carbohidratosPor100: "62.5",
    grasasPor100: "0",
    // 40 mg por gel de 40 g.
    cafeinaPor100: "100",
  };
}

function isotonica(ml: string): AlimentoFormulario {
  return {
    ...alimentoVacio(),
    nombre: "Isotónica",
    unidadBase: "MILILITRO",
    cantidadGramos: ml,
    caloriasPor100: "24",
    carbohidratosPor100: "6",
  };
}

function formulario(): FormularioPlanificacion {
  return {
    ...formularioVacio("Media maratón"),
    distanciaKm: "21,1",
    duracion: "1:45",
    horaLargada: "08:00",
    carbohidratosObjetivoGH: "45",
    liquidosObjetivoMlH: "350",
    pesoReferenciaKg: "62,5",
    ingestas: [
      {
        ...ingestaVacia(),
        antesDeLargar: true,
        tiempo: "0:15",
        alimentos: [gel("1")],
      },
      {
        ...ingestaVacia(),
        tiempo: "0:35",
        alimentos: [gel("1"), isotonica("150")],
      },
      {
        ...ingestaVacia(),
        tiempo: "1:10",
        alimentos: [gel("1.5"), isotonica("200")],
      },
      {
        ...ingestaVacia(),
        tiempo: "1:30",
        notas: "Agua en el puesto",
        alimentos: [],
      },
    ],
  };
}

describe("resumen en vivo ↔ dominio", () => {
  it("da el mismo resumen que la entidad", () => {
    const f = formulario();
    const contenido = paraGuardar(f);
    let n = 0;
    const entidad = PlanificacionDeportiva.crear(
      { ...contenido, grupoId: null },
      "pla-1",
      () => `id-${++n}`,
    );
    expect(resumenEnVivo(f)).toEqual(entidad.resumen);
    // Y la cafeína no es un caso trivial: hay antes, durante y peso.
    expect(entidad.resumen.cafeina.antesMg).toBe(40);
    expect(entidad.resumen.cafeina.mgPorKg).not.toBeNull();
  });

  it("sin duración no hay valores por hora, en los dos", () => {
    const f = { ...formulario(), duracion: "" };
    const vivo = resumenEnVivo(f);
    expect(vivo.durante.porHora.carbohidratosG).toBeNull();
    expect(vivo.intervaloMaximoMin).toBeNull();
  });

  it("la hora del día coincide con la del dominio", () => {
    for (const minuto of [-30, 0, 95, 1500]) {
      expect(horaDelDia("22:15", minuto)).toBe(horaDeIngesta("22:15", minuto));
    }
  });

  it("lee los tiempos como h:mm o minutos", () => {
    expect(minutosDesdeTexto("1:35")).toBe(95);
    expect(minutosDesdeTexto("45")).toBe(45);
    expect(minutosDesdeTexto("1h05")).toBe(65);
    expect(minutosDesdeTexto("1:75")).toBeNull();
    expect(minutosDesdeTexto("")).toBeNull();
  });

  it("la duración exige horas y minutos: «3» no son 3 minutos", () => {
    expect(duracionDesdeTexto("3:30")).toBe(210);
    expect(duracionDesdeTexto("3h")).toBe(180);
    expect(duracionDesdeTexto("3h30")).toBe(210);
    expect(duracionDesdeTexto("0:50")).toBe(50);
    expect(duracionDesdeTexto("3")).toBeNull();
    expect(duracionDesdeTexto("45")).toBeNull();
  });

  it("con la duración como número suelto no inventa valores por hora ni ingestas «después de llegar»", () => {
    // Antes: «3» se leía como 3 minutos y 884 kcal daban 17.680 kcal/h.
    const f = { ...formulario(), duracion: "3" };
    const vivo = resumenEnVivo(f);
    expect(vivo.durante.porHora.calorias).toBeNull();
    expect(vivo.durante.cantidad).toBe(3);
    expect(erroresDelFormulario(f)).toContain(
      "Indicá la duración estimada como h:mm (por ejemplo, 3:45; tres horas es 3:00).",
    );
  });
});

describe("erroresDelFormulario — números opcionales", () => {
  it("marca un número mal escrito en vez de descartarlo en silencio", () => {
    const f = {
      ...formulario(),
      pesoReferenciaKg: "70kg",
      carbohidratosObjetivoGH: "60 g/h",
      temperaturaEstimadaC: "-3",
    };
    const errores = erroresDelFormulario(f);
    expect(errores).toContain(
      "El peso del deportista tiene que ser un número.",
    );
    expect(errores).toContain(
      "El objetivo de carbohidratos tiene que ser un número.",
    );
    // Una temperatura bajo cero es válida.
    expect(errores.some((e) => e.includes("temperatura"))).toBe(false);
  });
});
