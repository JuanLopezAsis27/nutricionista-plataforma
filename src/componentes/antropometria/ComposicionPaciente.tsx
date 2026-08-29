"use client";

import {
  Activity,
  CalendarX,
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import type {
  ObjetivoComposicionDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import type { EstadoProyeccion } from "@/dominio/servicios/proyeccionComposicion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { DonutMasas } from "./DonutMasas";
import { EvolucionMasas, EvolucionGrasa } from "./EvolucionMasas";
import { TortaPlieguesProyectados } from "./TortaPlieguesProyectados";
import { TortaMasasConObjetivos } from "./TortaMasasConObjetivos";
import { useTemaComposicion } from "./useTemaComposicion";
import type { TemaComposicion } from "./paleta";

/**
 * Estados de la marcha hacia la meta, contados para el paciente.
 *
 * Mismos estados que ve el profesional, otra redacción: acá no se habla de
 * "ritmo semanal necesario" sino de qué falta. El color nunca va solo — cada
 * estado lleva ícono y frase.
 */
const ESTADOS: Record<
  EstadoProyeccion,
  {
    etiqueta: string;
    icono: typeof CheckCircle2;
    color: (t: TemaComposicion) => string;
  }
> = {
  ALCANZADO: {
    etiqueta: "¡Objetivo alcanzado!",
    icono: CheckCircle2,
    color: (t) => t.bien,
  },
  EN_CAMINO: {
    etiqueta: "Vas en camino",
    icono: TrendingDown,
    color: (t) => t.bien,
  },
  ATRASADO: {
    etiqueta: "Vas más lento de lo previsto",
    icono: TrendingUp,
    color: (t) => t.atencion,
  },
  ALEJANDOSE: {
    etiqueta: "Por ahora te estás alejando",
    icono: CircleAlert,
    color: (t) => t.alerta,
  },
  VENCIDO: {
    etiqueta: "Pasó la fecha prevista",
    icono: CalendarX,
    color: (t) => t.alerta,
  },
  SIN_DATOS: {
    etiqueta: "Falta una medición más",
    icono: HelpCircle,
    color: (t) => t.tintaSuave,
  },
};

/**
 * Portal del paciente: su composición corporal y sus objetivos, en lectura.
 *
 * Es una vista recortada a propósito. Quedan afuera el perfil Phantom, la
 * somatocarta, los índices técnicos y el control de calidad del
 * fraccionamiento: son herramientas de lectura profesional, y mostrarlas acá
 * sin quien las interprete confunde más de lo que informa. El paciente ve qué
 * midió, cómo viene y cuánto le falta.
 */
export function ComposicionPaciente() {
  const { miComposicion } = useEvaluacion();
  const consulta = miComposicion();
  const { tema, montado } = useTemaComposicion();

  if (consulta.isLoading || !montado) {
    return <Skeleton className="h-72 w-full" />;
  }
  if (consulta.isError || !consulta.data) {
    return (
      <p className="text-sm text-muted-foreground">
        No pudimos cargar tus mediciones. Probá de nuevo en un rato.
      </p>
    );
  }

  const { mediciones, objetivos } = consulta.data;

  if (mediciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Todavía no tenés mediciones cargadas. Tu nutricionista las va a tomar en
        la consulta y acá vas a ver tus resultados y tu evolución.
      </p>
    );
  }

  const actual = mediciones[mediciones.length - 1]!;
  const anterior =
    mediciones.length > 1 ? (mediciones[mediciones.length - 2] ?? null) : null;
  const { resultado } = actual;

  const grasa =
    resultado.grasaPorPliegues.resultados.find(
      (r) => r.metodo === actual.metodoGrasa,
    ) ?? resultado.grasaPorPliegues.resultados[0];

  const metodoSerie = grasa?.metodo ?? null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Última medición: <strong>{formatearFecha(actual.fecha)}</strong>
        {anterior && ` · anterior: ${formatearFecha(anterior.fecha)}`}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador
          icono={Scale}
          titulo="Peso"
          valor={formatearNumero(actual.medidas.pesoKg)}
          unidad="kg"
          detalle={
            anterior
              ? `${diferencia(actual.medidas.pesoKg - anterior.medidas.pesoKg)} kg desde la anterior`
              : undefined
          }
        />
        {grasa ? (
          <>
            <Indicador
              icono={Waves}
              titulo="Grasa corporal"
              valor={formatearNumero(grasa.porcentajeGrasa)}
              unidad="%"
              color={tema.masas.adiposa}
              detalle={`${formatearNumero(grasa.masaGrasaKg)} kg`}
            />
            <Indicador
              icono={Activity}
              titulo="Masa libre de grasa"
              valor={formatearNumero(grasa.masaLibreGrasaKg)}
              unidad="kg"
              color={tema.masas.muscular}
              detalle="Músculo, hueso, órganos y agua"
            />
          </>
        ) : resultado.fraccionamiento ? (
          <>
            <Indicador
              icono={Waves}
              titulo="Masa adiposa"
              valor={formatearNumero(resultado.fraccionamiento.adiposa.kg)}
              unidad="kg"
              color={tema.masas.adiposa}
              detalle={`${formatearNumero(resultado.fraccionamiento.adiposa.porcentaje)} % de tu peso`}
            />
            <Indicador
              icono={Activity}
              titulo="Masa muscular"
              valor={formatearNumero(resultado.fraccionamiento.muscular.kg)}
              unidad="kg"
              color={tema.masas.muscular}
              detalle={`${formatearNumero(resultado.fraccionamiento.muscular.porcentaje)} % de tu peso`}
            />
          </>
        ) : null}
      </div>

      {objetivos.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5 text-primary" /> Tus objetivos
          </h2>
          {resultado.fraccionamiento && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Tus masas hoy y a dónde apuntan tus objetivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TortaMasasConObjetivos
                  medicion={actual}
                  objetivos={objetivos}
                  tema={tema}
                />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {objetivos.map((objetivo) => (
              <TarjetaObjetivoPaciente
                key={objetivo.id}
                objetivo={objetivo}
                tema={tema}
              />
            ))}
          </div>
        </section>
      )}

      {resultado.fraccionamiento && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Cómo se reparte tu peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutMasas
              fraccionamiento={resultado.fraccionamiento}
              anterior={anterior?.resultado.fraccionamiento ?? null}
              tema={tema}
            />
          </CardContent>
        </Card>
      )}

      {mediciones.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Tu evolución
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-3">
            {metodoSerie != null ? (
              <EvolucionGrasa
                mediciones={mediciones}
                metodo={metodoSerie}
                tema={tema}
              />
            ) : (
              <div className="px-4">
                <EvolucionMasas mediciones={mediciones} tema={tema} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Un objetivo visto por el paciente: dónde está, a dónde va y cuánto falta.
 * Sin ritmos semanales ni fechas proyectadas: la lectura fina la hace el
 * profesional en la consulta.
 */
function TarjetaObjetivoPaciente({
  objetivo,
  tema,
}: {
  objetivo: ObjetivoComposicionDto;
  tema: TemaComposicion;
}) {
  const p = objetivo.proyeccion;
  const estado = ESTADOS[p.estado];
  const Icono = estado.icono;
  const color = estado.color(tema);
  const unidad = p.unidad ? ` ${p.unidad}` : "";
  const falta = p.brecha != null ? Math.abs(p.brecha) : null;
  const hayQueBajar = p.brecha != null && p.brecha < 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">{p.etiqueta}</p>
          <p className="text-xs text-muted-foreground">
            Meta: {formatearNumero(p.valorObjetivo)}
            {unidad}
            {p.fechaObjetivo && ` · para el ${formatearFecha(p.fechaObjetivo)}`}
          </p>
        </div>

        {/* Lo que el paciente quiere saber primero: cuánto falta. */}
        {falta != null && falta > 0 ? (
          <p className="text-sm">
            Te{" "}
            <span className="text-lg font-bold tabular-nums" style={{ color }}>
              {formatearNumero(falta)}
              {unidad}
            </span>{" "}
            {hayQueBajar ? "por bajar" : "por subir"} para llegar.
          </p>
        ) : (
          <p className="text-sm font-semibold" style={{ color }}>
            Ya llegaste a la meta.
          </p>
        )}

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              Empezaste en {formatearNumero(p.valorInicial)}
              {unidad}
            </span>
            <span className="tabular-nums">
              Ahora{" "}
              <strong className="text-foreground">
                {formatearNumero(p.valorActual)}
                {unidad}
              </strong>
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${p.progresoPorcentaje ?? 0}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Llevás{" "}
            <span className="font-semibold tabular-nums">
              {formatearNumero(p.progresoPorcentaje)} %
            </span>{" "}
            del camino.
          </p>
        </div>

        <p
          className="flex items-center gap-1.5 rounded-md p-2 text-xs font-medium"
          style={{ backgroundColor: `${color}14`, color }}
        >
          <Icono className="h-4 w-4 shrink-0" aria-hidden />
          {estado.etiqueta}
        </p>

        {objetivo.proyeccionPliegues && (
          <details className="border-t pt-3 text-xs">
            <summary className="cursor-pointer font-semibold">
              Cómo quedarían tus pliegues
            </summary>
            <div className="pt-2">
              <TortaPlieguesProyectados
                proyeccion={objetivo.proyeccionPliegues}
                tema={tema}
              />
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function Indicador({
  icono: Icono,
  titulo,
  valor,
  unidad,
  detalle,
  color,
}: {
  icono: typeof Scale;
  titulo: string;
  valor: string;
  unidad: string;
  detalle?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icono
            className="h-3.5 w-3.5"
            style={color ? { color } : undefined}
          />
          {titulo}
        </p>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums")}>
          {valor}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unidad}
          </span>
        </p>
        {detalle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function diferencia(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatearNumero(valor)}`;
}
