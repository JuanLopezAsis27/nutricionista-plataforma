"use client";

import {
  Activity,
  CalendarX,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileDown,
  HelpCircle,
  LineChart,
  PieChart,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { ObjetivoComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { EstadoProyeccion } from "@/dominio/servicios/proyeccionComposicion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Button } from "@/componentes/ui/button";
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
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
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
      <div className="rounded-xl border border-dashed p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Scale className="h-6 w-6 text-primary" />
        </span>
        <p className="pt-3 text-sm text-muted-foreground">
          Todavía no tenés mediciones cargadas. Tu nutricionista las va a tomar
          en la consulta y acá vas a ver tus resultados y tu evolución.
        </p>
      </div>
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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Última medición: </span>
          <strong>{formatearFecha(actual.fecha)}</strong>
          {anterior && (
            <span className="text-muted-foreground">
              {" · anterior: "}
              {formatearFecha(anterior.fecha)}
            </span>
          )}
        </p>
        <Button asChild variant="outline" size="sm">
          <a
            href={`/api/antropometria/${actual.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown className="h-4 w-4" />
            Descargar PDF
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador
          icono={Scale}
          titulo="Peso"
          valor={formatearMedida(actual.medidas.pesoKg)}
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
              valor={formatearMedida(grasa.porcentajeGrasa)}
              unidad="%"
              color={tema.masas.adiposa}
              detalle={`${formatearMedida(grasa.masaGrasaKg)} kg`}
            />
            <Indicador
              icono={Activity}
              titulo="Masa libre de grasa"
              valor={formatearMedida(grasa.masaLibreGrasaKg)}
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
              valor={formatearMedida(resultado.fraccionamiento.adiposa.kg)}
              unidad="kg"
              color={tema.masas.adiposa}
              detalle={`${formatearMedida(resultado.fraccionamiento.adiposa.porcentaje)} % de tu peso`}
            />
            <Indicador
              icono={Activity}
              titulo="Masa muscular"
              valor={formatearMedida(resultado.fraccionamiento.muscular.kg)}
              unidad="kg"
              color={tema.masas.muscular}
              detalle={`${formatearMedida(resultado.fraccionamiento.muscular.porcentaje)} % de tu peso`}
            />
          </>
        ) : null}
      </div>

      {objetivos.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </span>
            Tus objetivos
          </h2>
          {resultado.fraccionamiento && (
            <Card className="overflow-hidden">
              <CabeceraTarjeta
                icono={Target}
                titulo="Tus masas hoy y a dónde apuntan tus objetivos"
                fondo="bg-primary/5"
                tinte="bg-primary/10"
                color="text-primary"
              />
              <CardContent className="p-4">
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
        <Card className="overflow-hidden">
          <CabeceraTarjeta
            icono={PieChart}
            titulo="Cómo se reparte tu peso"
            fondo="bg-emerald-500/5"
            tinte="bg-emerald-500/10"
            color="text-emerald-600 dark:text-emerald-400"
          />
          <CardContent className="p-4">
            <DonutMasas
              fraccionamiento={resultado.fraccionamiento}
              anterior={anterior?.resultado.fraccionamiento ?? null}
              tema={tema}
            />
          </CardContent>
        </Card>
      )}

      {mediciones.length > 1 && (
        <Card className="overflow-hidden">
          <CabeceraTarjeta
            icono={LineChart}
            titulo="Tu evolución"
            fondo="bg-sky-500/5"
            tinte="bg-sky-500/10"
            color="text-sky-600 dark:text-sky-400"
          />
          <CardContent className="py-4 pl-0 pr-3">
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
            Meta: {formatearMedida(p.valorObjetivo)}
            {unidad}
            {p.fechaObjetivo && ` · para el ${formatearFecha(p.fechaObjetivo)}`}
          </p>
        </div>

        {/* Lo que el paciente quiere saber primero: cuánto falta. */}
        {falta != null && falta > 0 ? (
          <p className="text-sm">
            Te{" "}
            <span className="text-lg font-bold tabular-nums" style={{ color }}>
              {formatearMedida(falta)}
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
              Empezaste en {formatearMedida(p.valorInicial)}
              {unidad}
            </span>
            <span className="tabular-nums">
              Ahora{" "}
              <strong className="text-foreground">
                {formatearMedida(p.valorActual)}
                {unidad}
              </strong>
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
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
              {formatearMedida(p.progresoPorcentaje)} %
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
          <details className="group border-t pt-3 text-xs">
            <summary className="flex cursor-pointer items-center gap-1 font-semibold text-primary">
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
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

/**
 * Cabecera de una tarjeta de la pantalla: su ícono en un cuadrado de color y el
 * título. El color agrupa —masas, evolución, objetivos— y el título lo dice.
 */
function CabeceraTarjeta({
  icono: Icono,
  titulo,
  fondo,
  tinte,
  color,
}: {
  icono: LucideIcon;
  titulo: string;
  fondo: string;
  tinte: string;
  color: string;
}) {
  return (
    <CardHeader className={cn("border-b p-4", fondo)}>
      <CardTitle className="flex items-center gap-2 text-base">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tinte,
          )}
        >
          <Icono className={cn("h-4 w-4", color)} />
        </span>
        {titulo}
      </CardTitle>
    </CardHeader>
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
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color ?? "#F4535E"}1a` }}
        >
          <Icono className="h-4 w-4" style={{ color: color ?? undefined }} />
        </span>
        <p className="pt-2 text-2xl font-bold leading-none tabular-nums">
          {valor}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unidad}
          </span>
        </p>
        <p className="pt-1.5 text-xs font-medium">{titulo}</p>
        {detalle && (
          <p className="pt-0.5 text-xs text-muted-foreground">{detalle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function diferencia(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatearMedida(valor)}`;
}
