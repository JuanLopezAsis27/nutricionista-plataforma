import {
  TOLERANCIA_OBJETIVO,
  type EstadoObjetivo,
} from "@/dominio/entidades/PlanificacionDeportiva";
import {
  aNumero,
  calcularTotales,
  redondear1,
  type Macros,
} from "@/componentes/comunes/alimentos/macros";
import { gramosEnFormulario } from "@/componentes/comunes/alimentos/cantidad";
import {
  minutoDeIngesta,
  minutosDesdeTexto,
  type FormularioPlanificacion,
  type IngestaFormulario,
} from "./esquema";

/**
 * El resumen de la planificación MIENTRAS SE EDITA: g/h de carbohidratos, ml/h
 * de líquidos y el lapso más largo sin ingerir, a medida que se cargan los
 * geles.
 *
 * Es el espejo de `PlanificacionDeportiva.resumen`: la presentación no puede
 * llamar al dominio, y el profesional decide mirando estos números. Las dos
 * cuentas tienen que decir lo mismo, y de eso se ocupa `resumen.test.ts`. La
 * regla que más se presta a copiarse mal: solo suma lo que cae entre la
 * largada y la llegada estimada; lo de antes de largar va aparte.
 */

export interface ResumenEnVivo {
  durante: {
    cantidad: number;
    macros: Macros;
    liquidosMl: number | null;
    porHora: {
      calorias: number | null;
      carbohidratosG: number | null;
      liquidosMl: number | null;
    };
  };
  antes: { cantidad: number; macros: Macros; liquidosMl: number | null };
  carbohidratos: EstadoObjetivo | null;
  liquidos: EstadoObjetivo | null;
  intervaloMaximoMin: number | null;
  cafeina: {
    antesMg: number | null;
    duranteMg: number | null;
    totalMg: number | null;
    porHoraMg: number | null;
    mgPorKg: number | null;
  };
}

/** mg de cafeína de una ingesta (espejo de `cafeinaDeIngesta`). */
export function cafeinaDeIngestaEnFormulario(
  ingesta: Pick<IngestaFormulario, "alimentos">,
): number | null {
  let total = 0;
  let hay = false;
  for (const a of ingesta.alimentos) {
    const porCien = aNumero(a.cafeinaPor100);
    const cantidad = gramosEnFormulario(a);
    if (porCien == null || cantidad == null || cantidad <= 0) continue;
    total += (porCien * cantidad) / 100;
    hay = true;
  }
  return hay ? redondear1(total) : null;
}

/** ml de una ingesta: sus alimentos en mililitros. Null si no hay ninguno. */
export function liquidosDeIngestaEnFormulario(
  ingesta: Pick<IngestaFormulario, "alimentos">,
): number | null {
  const ml = ingesta.alimentos
    .filter((a) => a.unidadBase === "MILILITRO")
    .map((a) => gramosEnFormulario(a))
    .filter((v): v is number => v != null);
  if (ml.length === 0) return null;
  return Math.round(ml.reduce((total, v) => total + v, 0));
}

export function resumenEnVivo(f: FormularioPlanificacion): ResumenEnVivo {
  const duracion = minutosDesdeTexto(f.duracion);
  const conMinuto = f.ingestas
    .map((ingesta) => ({ ingesta, minuto: minutoDeIngesta(ingesta) }))
    .filter(
      (x): x is { ingesta: IngestaFormulario; minuto: number } =>
        x.minuto != null,
    );
  const durante = conMinuto.filter(
    ({ minuto }) => minuto >= 0 && (duracion == null || minuto <= duracion),
  );
  const antes = conMinuto.filter(({ minuto }) => minuto < 0);

  const macrosDe = (lista: typeof conMinuto): Macros =>
    calcularTotales(lista.flatMap(({ ingesta }) => ingesta.alimentos));
  const liquidosDe = (lista: typeof conMinuto): number | null => {
    const valores = lista
      .map(({ ingesta }) => liquidosDeIngestaEnFormulario(ingesta))
      .filter((v): v is number => v != null);
    return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : null;
  };

  const cafeinaDe = (lista: typeof conMinuto): number | null => {
    const valores = lista
      .map(({ ingesta }) => cafeinaDeIngestaEnFormulario(ingesta))
      .filter((v): v is number => v != null);
    return valores.length > 0
      ? redondear1(valores.reduce((a, b) => a + b, 0))
      : null;
  };

  const macrosDurante = macrosDe(durante);
  const liquidosDurante = liquidosDe(durante);
  const horas = duracion != null && duracion > 0 ? duracion / 60 : null;
  const porHora = (valor: number | null): number | null =>
    valor != null && horas != null ? redondear1(valor / horas) : null;
  const calorias = porHora(macrosDurante.calorias);
  const liquidos = porHora(liquidosDurante);

  return {
    durante: {
      cantidad: durante.length,
      macros: macrosDurante,
      liquidosMl: liquidosDurante,
      porHora: {
        calorias: calorias != null ? Math.round(calorias) : null,
        carbohidratosG: porHora(macrosDurante.carbohidratosG),
        liquidosMl: liquidos != null ? Math.round(liquidos) : null,
      },
    },
    antes: {
      cantidad: antes.length,
      macros: macrosDe(antes),
      liquidosMl: liquidosDe(antes),
    },
    carbohidratos: compararConObjetivo(
      porHora(macrosDurante.carbohidratosG),
      aNumero(f.carbohidratosObjetivoGH),
    ),
    liquidos: compararConObjetivo(liquidos, aNumero(f.liquidosObjetivoMlH)),
    intervaloMaximoMin: intervaloMaximo(
      durante.map(({ minuto }) => minuto),
      duracion,
    ),
    cafeina: resumenCafeina(
      cafeinaDe(antes),
      cafeinaDe(durante),
      horas,
      aNumero(f.pesoReferenciaKg),
    ),
  };
}

/** Espejo de `resumenCafeina` del dominio. */
function resumenCafeina(
  antesMg: number | null,
  duranteMg: number | null,
  horas: number | null,
  pesoKg: number | null,
): ResumenEnVivo["cafeina"] {
  const totalMg =
    antesMg == null && duranteMg == null
      ? null
      : redondear1((antesMg ?? 0) + (duranteMg ?? 0));
  return {
    antesMg,
    duranteMg,
    totalMg,
    porHoraMg:
      duranteMg != null && horas != null && horas > 0
        ? Math.round(duranteMg / horas)
        : null,
    mgPorKg:
      totalMg != null && pesoKg != null && pesoKg > 0
        ? redondear1(totalMg / pesoKg)
        : null,
  };
}

function compararConObjetivo(
  valor: number | null,
  objetivo: number | null,
): EstadoObjetivo | null {
  if (valor == null || objetivo == null || objetivo <= 0) return null;
  if (valor < objetivo * (1 - TOLERANCIA_OBJETIVO)) return "DEBAJO";
  if (valor > objetivo * (1 + TOLERANCIA_OBJETIVO)) return "ENCIMA";
  return "CUMPLE";
}

function intervaloMaximo(
  minutos: number[],
  duracion: number | null,
): number | null {
  if (duracion == null || duracion <= 0) return null;
  const puntos = [0, ...minutos, duracion].sort((a, b) => a - b);
  let maximo = 0;
  for (let i = 1; i < puntos.length; i++) {
    maximo = Math.max(maximo, puntos[i]! - puntos[i - 1]!);
  }
  return maximo;
}

/**
 * La hora del día con la hora de largada (espejo de `horaDeIngesta`).
 * «07:00» + 95 → «08:35».
 */
export function horaDelDia(
  horaLargada: string,
  minuto: number | null,
): string | null {
  if (minuto == null || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaLargada)) {
    return null;
  }
  const [h, m] = horaLargada.split(":").map(Number);
  const total = (((h! * 60 + m! + minuto) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
