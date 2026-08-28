"use client";

import { useState } from "react";
import {
  Activity,
  Flame,
  Info,
  Ruler,
  Scale,
  TriangleAlert,
  Waves,
} from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type {
  BloqueFaltante,
  RiesgoCinturaCadera,
} from "@/dominio/servicios/composicionCorporal";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { DEFINICIONES_METODO } from "@/dominio/servicios/grasaPorPliegues";
import { DonutMasas } from "./DonutMasas";
import {
  EvolucionMasas,
  EvolucionScoreZ,
  EvolucionGrasa,
} from "./EvolucionMasas";
import { PanelGrasaPliegues, AvisoDosModelos } from "./PanelGrasaPliegues";
import { PerfilPhantom } from "./PerfilPhantom";
import { Somatocarta, type PuntoSomatocarta } from "./Somatocarta";
import { useTemaComposicion } from "./useTemaComposicion";
import type { TemaComposicion } from "./paleta";

const ETIQUETAS_RIESGO: Record<RiesgoCinturaCadera, string> = {
  BAJO: "Riesgo bajo",
  MODERADO: "Riesgo moderado",
  ALTO: "Riesgo alto",
  MUY_ALTO: "Riesgo muy alto",
};

const ETIQUETAS_BLOQUE: Record<BloqueFaltante["bloque"], string> = {
  FRACCIONAMIENTO: "Fraccionamiento en 5 masas",
  SOMATOTIPO: "Somatotipo",
  ENERGIA: "Metabolismo y peso ideal",
  INDICES: "Índices",
};

/**
 * Dashboard de composición corporal.
 *
 * Todo lo que se ve acá se recalcula desde las medidas crudas en el dominio;
 * el componente solo elige QUÉ medición mirar y cómo dibujarla. La medición
 * seleccionada por defecto es la última, y la comparación es siempre contra
 * la inmediatamente anterior.
 */
export function DashboardComposicion({
  mediciones,
}: {
  mediciones: MedicionComposicionDto[];
}) {
  const { tema, montado } = useTemaComposicion();
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [metodoSerie, setMetodoSerie] = useState<MetodoGrasa | null>(null);

  if (!montado) return null;

  if (mediciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Todavía no hay mediciones. Cargá una en la pestaña «Mediciones» y acá
        vas a ver el fraccionamiento, el somatotipo y el perfil de
        proporcionalidad.
      </p>
    );
  }

  const indiceActual =
    seleccionadaId != null
      ? Math.max(
          0,
          mediciones.findIndex((m) => m.id === seleccionadaId),
        )
      : mediciones.length - 1;
  const actual = mediciones[indiceActual]!;
  const anterior =
    indiceActual > 0 ? (mediciones[indiceActual - 1] ?? null) : null;
  const { resultado } = actual;

  const hastaActual = mediciones.slice(0, indiceActual + 1);
  const puntosSomatocarta: PuntoSomatocarta[] = hastaActual
    .filter((m) => m.resultado.somatotipo != null)
    .map((m) => ({ fecha: m.fecha, somatotipo: m.resultado.somatotipo! }));

  // Ecuación de grasa que manda en esta medición: la elegida a mano o, si no
  // se eligió ninguna, la primera que las medidas hayan resuelto.
  const grasaDestacada =
    resultado.grasaPorPliegues.resultados.find(
      (r) => r.metodo === actual.metodoGrasa,
    ) ?? resultado.grasaPorPliegues.resultados[0];

  // Para la serie histórica: los métodos que al menos una medición resolvió.
  const metodosDisponibles = [
    ...new Set(
      mediciones.flatMap((m) =>
        m.resultado.grasaPorPliegues.resultados.map((r) => r.metodo),
      ),
    ),
  ];
  const metodoDeSerie =
    metodoSerie ?? grasaDestacada?.metodo ?? metodosDisponibles[0] ?? null;

  const dosComponentesPrimero = actual.protocolo === "DOS_COMPONENTES";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            Medición del {formatearFecha(actual.fecha)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {actual.edadAnios != null &&
              `${formatearNumero(actual.edadAnios)} años · `}
            {anterior
              ? `Comparada con la del ${formatearFecha(anterior.fecha)}`
              : "Primera medición del paciente"}
          </p>
        </div>
        {mediciones.length > 1 && (
          <Select
            value={actual.id}
            onValueChange={(valor) => setSeleccionadaId(valor)}
          >
            <SelectTrigger className="w-auto min-w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...mediciones].reverse().map((m, indice) => (
                <SelectItem key={m.id} value={m.id}>
                  {formatearFecha(m.fecha)}
                  {indice === 0 && " (última)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <AvisoFaltantes faltantes={resultado.faltantes} />

      {/* Indicadores de cabecera: lo que se mira primero. */}
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

      {dosComponentesPrimero && (
        <TarjetaGrasa
          actual={actual}
          anterior={anterior}
          grasaDestacada={grasaDestacada}
          tema={tema}
        />
      )}

      {resultado.fraccionamiento && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Fraccionamiento en 5 masas{" "}
              <span className="font-normal text-muted-foreground">
                (Kerr, 1988)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DonutMasas
              fraccionamiento={resultado.fraccionamiento}
              anterior={anterior?.resultado.fraccionamiento ?? null}
              tema={tema}
            />
            <p className="border-t pt-3 text-xs text-muted-foreground">
              Peso estructurado{" "}
              {formatearNumero(resultado.fraccionamiento.pesoEstructuradoKg)} kg
              · diferencia con la balanza{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  Math.abs(resultado.fraccionamiento.diferenciaPorcentaje) >
                    0.02 && "text-destructive",
                )}
              >
                {formatearNumero(
                  resultado.fraccionamiento.diferenciaPorcentaje * 100,
                )}{" "}
                %
              </span>
              . Por encima del 2 % conviene revisar la toma de medidas.
            </p>
          </CardContent>
        </Card>
      )}

      {!dosComponentesPrimero && (
        <TarjetaGrasa
          actual={actual}
          anterior={anterior}
          grasaDestacada={grasaDestacada}
          tema={tema}
        />
      )}

      {mediciones.length > 1 && metodoDeSerie != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
              <span>Evolución del porcentaje graso</span>
              {metodosDisponibles.length > 1 && (
                <Select
                  value={metodoDeSerie}
                  onValueChange={(valor) =>
                    setMetodoSerie(valor as MetodoGrasa)
                  }
                >
                  <SelectTrigger className="h-8 w-auto min-w-[14rem] text-xs font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosDisponibles.map((metodo) => (
                      <SelectItem key={metodo} value={metodo}>
                        {DEFINICIONES_METODO[metodo].etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-3">
            <EvolucionGrasa
              mediciones={mediciones}
              metodo={metodoDeSerie}
              tema={tema}
            />
            <p className="px-4 pt-2 text-xs text-muted-foreground">
              Toda la serie usa la misma ecuación. Cambiar de método a mitad de
              seguimiento mueve el número sin que el paciente haya cambiado.
            </p>
          </CardContent>
        </Card>
      )}

      {mediciones.length > 1 && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Evolución de las masas
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-0 pr-3">
              <div className="px-4">
                <EvolucionMasas mediciones={mediciones} tema={tema} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Score-Z de las masas
                <span className="ml-1 font-normal text-muted-foreground">
                  (contra el Phantom)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-0 pr-3">
              <EvolucionScoreZ mediciones={mediciones} tema={tema} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {resultado.somatotipo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Somatotipo{" "}
                <span className="font-normal text-muted-foreground">
                  (Heath &amp; Carter, 1990)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Somatocarta puntos={puntosSomatocarta} tema={tema} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Proporcionalidad Phantom
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PerfilPhantom
              puntos={resultado.phantom}
              anteriores={anterior?.resultado.phantom ?? null}
              tema={tema}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Ruler className="h-4 w-4 text-muted-foreground" /> Índices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <Fila
                etiqueta="IMC"
                valor={resultado.indices.imc}
                unidad="kg/m²"
              />
              <Fila
                etiqueta="Índice cintura/cadera"
                valor={resultado.indices.indiceCinturaCadera}
                nota={
                  resultado.indices.riesgoCinturaCadera
                    ? ETIQUETAS_RIESGO[resultado.indices.riesgoCinturaCadera]
                    : undefined
                }
              />
              <Fila
                etiqueta="Σ 6 pliegues"
                valor={resultado.indices.sumatoria6Pliegues}
                unidad="mm"
              />
              <Fila
                etiqueta="Índice músculo/óseo"
                valor={resultado.indices.indiceMusculoOseo}
              />
              <Fila
                etiqueta="Índice adiposo/muscular"
                valor={resultado.indices.indiceAdiposoMuscular}
              />
              <Fila
                etiqueta="Índice córmico"
                valor={resultado.indices.indiceCormico}
                unidad="%"
                nota="Talla sentado / talla"
              />
              <Fila
                etiqueta="Superficie corporal"
                valor={resultado.indices.superficieCorporalM2}
                unidad="m²"
                nota="Du Bois, 1916"
              />
              <Fila
                etiqueta="Índice muscular/lastre"
                valor={resultado.indices.indiceMuscularLastre}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Flame className="h-4 w-4 text-muted-foreground" /> Energía y peso
              de referencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultado.energia == null ? (
              <p className="text-sm text-muted-foreground">
                Para estimar el metabolismo hacen falta la talla, el sexo
                biológico y la fecha de nacimiento del paciente.
              </p>
            ) : (
              <dl className="divide-y text-sm">
                <Fila
                  etiqueta="Peso ideal (OMS)"
                  valor={resultado.energia.pesoIdealKg}
                  unidad="kg"
                  nota={`Rango ${formatearNumero(resultado.energia.pesoIdealMinKg)}–${formatearNumero(resultado.energia.pesoIdealMaxKg)} kg`}
                />
                <Fila
                  etiqueta="Masa libre de grasa"
                  valor={resultado.energia.masaLibreGrasaKg}
                  unidad="kg"
                />
                <Fila
                  etiqueta="Metabolismo basal"
                  valor={resultado.energia.metabolismoBasalKcal}
                  unidad="kcal"
                  nota="Harris & Benedict, 1919"
                />
                <Fila
                  etiqueta="MB (Cunningham)"
                  valor={resultado.energia.metabolismoCunninghamKcal}
                  unidad="kcal"
                  nota="Sobre masa libre de grasa"
                />
                <Fila
                  etiqueta="MB (Kleiber)"
                  valor={resultado.energia.metabolismoKleiberKcal}
                  unidad="kcal"
                />
                <Fila
                  etiqueta="Gasto energético total"
                  valor={resultado.energia.gastoEnergeticoTotalKcal}
                  unidad="kcal"
                  nota={
                    resultado.energia.factorActividad != null
                      ? `Factor ${formatearNumero(resultado.energia.factorActividad)} (OMS, 1985)`
                      : "Cargá el nivel de actividad de la medición"
                  }
                  destacado
                />
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Qué medidas hacen falta para completar los bloques que no se calcularon. */
function AvisoFaltantes({ faltantes }: { faltantes: BloqueFaltante[] }) {
  const conFaltas = faltantes.filter((f) => f.campos.length > 0);
  if (conFaltas.length === 0) return null;

  return (
    <div className="flex gap-3 rounded-md border border-dashed p-3 text-sm">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Esta medición no alcanza para todo</p>
        {conFaltas.map((bloque) => (
          <p key={bloque.bloque} className="text-xs text-muted-foreground">
            <span className="font-medium">
              {ETIQUETAS_BLOQUE[bloque.bloque]}:
            </span>{" "}
            falta {bloque.campos.join(", ").toLowerCase()}.
          </p>
        ))}
      </div>
    </div>
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
        <p className="mt-1 text-2xl font-bold tabular-nums">
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

function Fila({
  etiqueta,
  valor,
  unidad,
  nota,
  destacado,
}: {
  etiqueta: string;
  valor: number | null;
  unidad?: string;
  nota?: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="min-w-0">
        <span className={cn(destacado && "font-semibold")}>{etiqueta}</span>
        {nota && (
          <span className="block text-xs text-muted-foreground">{nota}</span>
        )}
      </dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          destacado ? "text-base font-bold" : "font-medium",
        )}
      >
        {formatearNumero(valor)}
        {unidad && valor != null && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unidad}
          </span>
        )}
      </dd>
    </div>
  );
}

function signo(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatearNumero(valor)}`;
}

/**
 * Modelo de 2 componentes de la medición seleccionada.
 *
 * Cuando la medición también resuelve el fraccionamiento de Kerr, agrega el
 * aviso que compara los dos números: la brecha entre ellos es esperable y no
 * un error de carga, pero hay que decirlo o se lee como contradicción.
 */
function TarjetaGrasa({
  actual,
  anterior,
  grasaDestacada,
  tema,
}: {
  actual: MedicionComposicionDto;
  anterior: MedicionComposicionDto | null;
  grasaDestacada:
    | MedicionComposicionDto["resultado"]["grasaPorPliegues"]["resultados"][number]
    | undefined;
  tema: TemaComposicion;
}) {
  const fraccionamiento = actual.resultado.fraccionamiento;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Grasa corporal por pliegues{" "}
          <span className="font-normal text-muted-foreground">
            (modelo de 2 componentes)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PanelGrasaPliegues
          grasa={actual.resultado.grasaPorPliegues}
          metodoDestacado={actual.metodoGrasa}
          anterior={anterior?.resultado.grasaPorPliegues ?? null}
          pesoKg={actual.medidas.pesoKg}
          tema={tema}
        />
        {fraccionamiento != null && grasaDestacada != null && (
          <AvisoDosModelos
            masaAdiposaKg={fraccionamiento.adiposa.kg}
            porcentajeAdiposa={fraccionamiento.adiposa.porcentaje}
            masaGrasaKg={grasaDestacada.masaGrasaKg}
            porcentajeGrasa={grasaDestacada.porcentajeGrasa}
            etiquetaMetodo={grasaDestacada.etiqueta}
          />
        )}
      </CardContent>
    </Card>
  );
}
