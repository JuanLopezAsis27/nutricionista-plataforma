import { Activity, Flame, Scale, Waves } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { TemaComposicion } from "../paleta";
import { formatearNumero } from "@/lib/formato";
import { Indicador, signo } from "./piezas";

type ResultadoGrasa =
  MedicionComposicionDto["resultado"]["grasaPorPliegues"]["resultados"][number];

/**
 * La fila de cuatro indicadores de arriba de todo: lo que el profesional mira
 * antes que nada.
 *
 * Los dos del medio cambian según el protocolo de la medición, y ese es el
 * punto de la pantalla: en DOS_COMPONENTES manda el modelo de pliegues (grasa
 * y masa libre de grasa) y en el resto, el fraccionamiento de Kerr (adiposa y
 * muscular). Mostrar los cuatro juntos daría dos cifras de grasa distintas del
 * mismo paciente, que se leen como una contradicción.
 */
export function IndicadoresCabecera({
  actual,
  anterior,
  grasaDestacada,
  dosComponentesPrimero,
  tema,
}: {
  actual: MedicionComposicionDto;
  anterior: MedicionComposicionDto | null;
  grasaDestacada: ResultadoGrasa | undefined;
  dosComponentesPrimero: boolean;
  tema: TemaComposicion;
}) {
  const { resultado } = actual;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Indicador
        icono={Scale}
        titulo="Peso"
        valor={formatearNumero(actual.medidas.pesoKg)}
        unidad="kg"
        detalle={
          anterior
            ? `${signo(actual.medidas.pesoKg - anterior.medidas.pesoKg)} kg vs. anterior`
            : resultado.indices.imc != null
              ? `IMC ${formatearNumero(resultado.indices.imc)}`
              : undefined
        }
      />
      {dosComponentesPrimero ? (
        <>
          <Indicador
            icono={Waves}
            titulo="Grasa corporal"
            valor={
              grasaDestacada
                ? formatearNumero(grasaDestacada.porcentajeGrasa)
                : "—"
            }
            unidad="%"
            color={tema.masas.adiposa}
            detalle={
              grasaDestacada
                ? `${formatearNumero(grasaDestacada.masaGrasaKg)} kg · ${grasaDestacada.etiqueta}`
                : "Faltan pliegues o el sexo del paciente"
            }
          />
          <Indicador
            icono={Activity}
            titulo="Masa libre de grasa"
            valor={
              grasaDestacada
                ? formatearNumero(grasaDestacada.masaLibreGrasaKg)
                : "—"
            }
            unidad="kg"
            color={tema.masas.muscular}
            detalle={
              grasaDestacada
                ? `${formatearNumero(100 - grasaDestacada.porcentajeGrasa)} % del peso`
                : "Faltan medidas"
            }
          />
        </>
      ) : (
        <>
          <Indicador
            icono={Waves}
            titulo="Masa adiposa"
            valor={
              resultado.fraccionamiento
                ? formatearNumero(resultado.fraccionamiento.adiposa.kg)
                : "—"
            }
            unidad="kg"
            color={tema.masas.adiposa}
            detalle={
              resultado.fraccionamiento
                ? `${formatearNumero(resultado.fraccionamiento.adiposa.porcentaje)} % del peso`
                : "Faltan medidas"
            }
          />
          <Indicador
            icono={Activity}
            titulo="Masa muscular"
            valor={
              resultado.fraccionamiento
                ? formatearNumero(resultado.fraccionamiento.muscular.kg)
                : "—"
            }
            unidad="kg"
            color={tema.masas.muscular}
            detalle={
              resultado.fraccionamiento
                ? `${formatearNumero(resultado.fraccionamiento.muscular.porcentaje)} % del peso`
                : "Faltan medidas"
            }
          />
        </>
      )}
      <Indicador
        icono={Flame}
        titulo={
          resultado.energia?.gastoEnergeticoTotalKcal != null
            ? "Gasto total"
            : "Metabolismo basal"
        }
        valor={
          resultado.energia
            ? formatearNumero(
                resultado.energia.gastoEnergeticoTotalKcal ??
                  resultado.energia.metabolismoBasalKcal,
              )
            : "—"
        }
        unidad="kcal"
        detalle={
          resultado.energia == null
            ? "Falta sexo o fecha de nacimiento"
            : resultado.energia.gastoEnergeticoTotalKcal != null
              ? `MB ${formatearNumero(resultado.energia.metabolismoBasalKcal)} × ${formatearNumero(resultado.energia.factorActividad)}`
              : "Cargá el nivel de actividad para el gasto total"
        }
      />
    </div>
  );
}
