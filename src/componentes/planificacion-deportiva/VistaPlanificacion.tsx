"use client";

import {
  Flag,
  Mountain,
  Clock,
  Thermometer,
  Gauge,
  Trophy,
  MapPin,
} from "lucide-react";
import type {
  CompetenciaDeAsignacionSalidaDto,
  PlanificacionSalidaDto,
} from "@/aplicacion/dtos/planificacionDeportiva.dto";
import { ETIQUETA_MODALIDAD_CARRERA } from "@/dominio/entidades/PlanificacionDeportiva";
import { formatearFecha } from "@/lib/formato";
import { Badge } from "@/componentes/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  TarjetaResumen,
  numero,
  textoDuracion,
  textoRitmo,
} from "./presentacion";

/**
 * Una planificación deportiva para LEER: la carrera, los números por hora y la
 * línea de tiempo de ingestas. La comparten la página del profesional y el
 * portal del paciente, para que los dos lean exactamente lo mismo.
 *
 * La línea de tiempo dice cada ingesta como la vive el corredor: el tiempo de
 * carrera («0:45»), la hora del día si hay hora de largada y el kilómetro
 * (el cargado, o el aproximado a ritmo parejo en calle, marcado con «≈»).
 */
export function VistaPlanificacion({
  planificacion: p,
  competencia,
}: {
  planificacion: PlanificacionSalidaDto;
  competencia?: CompetenciaDeAsignacionSalidaDto | null;
}) {
  const c = p.carrera;
  const ritmo = textoRitmo(c?.ritmoMinPorKm);

  return (
    <div className="space-y-4">
      {competencia && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-primary/5 p-3 text-sm">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="font-medium">{competencia.nombre}</span>
          <span className="text-muted-foreground">
            {formatearFecha(competencia.fecha)}
            {competencia.lugar && ` · ${competencia.lugar}`}
          </span>
        </div>
      )}

      {c && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Flag className="h-4 w-4 text-primary" />
              {numero(c.distanciaKm, " km")}
              <Badge variant="secondary">
                {ETIQUETA_MODALIDAD_CARRERA[c.modalidad]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Dato icono={Clock} etiqueta="Duración estimada">
                {textoDuracion(c.duracionEstimadaMin)}
              </Dato>
              {ritmo && (
                <Dato icono={Gauge} etiqueta="Ritmo">
                  {ritmo}
                </Dato>
              )}
              {c.horaLargada && (
                <Dato icono={Flag} etiqueta="Largada">
                  {c.horaLargada} h
                </Dato>
              )}
              {c.temperaturaEstimadaC != null && (
                <Dato icono={Thermometer} etiqueta="Temperatura">
                  {numero(c.temperaturaEstimadaC, " °C")}
                </Dato>
              )}
              {(c.desnivelPositivoM != null || c.desnivelNegativoM != null) && (
                <Dato icono={Mountain} etiqueta="Desnivel">
                  {[
                    c.desnivelPositivoM != null && `+${c.desnivelPositivoM} m`,
                    c.desnivelNegativoM != null && `−${c.desnivelNegativoM} m`,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </Dato>
              )}
            </div>
            {p.descripcion && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {p.descripcion}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Durante la carrera</CardTitle>
        </CardHeader>
        <CardContent>
          <TarjetaResumen
            resumen={p.resumen}
            objetivos={{
              carbohidratosGH: c?.carbohidratosObjetivoGH ?? null,
              liquidosMlH: c?.liquidosObjetivoMlH ?? null,
              sodioMgH: c?.sodioObjetivoMgH ?? null,
            }}
            pesoKg={p.pesoReferenciaKg}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan de ingestas</CardTitle>
        </CardHeader>
        <CardContent>
          {p.ingestas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay ingestas cargadas.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l pl-5">
              {p.ingestas.map((ingesta) => (
                <li key={ingesta.id} className="relative">
                  <span
                    className={
                      ingesta.minuto < 0
                        ? "absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-muted-foreground bg-background"
                        : "absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full bg-primary"
                    }
                    aria-hidden
                  />
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-semibold tabular-nums">
                      {ingesta.minuto < 0
                        ? `${ingesta.tiempo.replace("-", "")} antes de largar`
                        : ingesta.minuto === 0
                          ? "En la largada"
                          : `${ingesta.tiempo} de carrera`}
                    </span>
                    {ingesta.hora && (
                      <span className="text-muted-foreground">
                        {ingesta.hora} h
                      </span>
                    )}
                    {ingesta.km != null ? (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> km {numero(ingesta.km)}
                      </span>
                    ) : (
                      ingesta.kmEstimado != null && (
                        <span className="text-muted-foreground">
                          ≈ km {numero(ingesta.kmEstimado)}
                        </span>
                      )
                    )}
                  </p>
                  {ingesta.alimentos.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {ingesta.alimentos.map((a) => (
                        <li key={a.id}>
                          {a.nombre}
                          {a.cantidadTexto && (
                            <span className="text-muted-foreground">
                              {" "}
                              — {a.cantidadTexto}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {ingesta.notas && (
                    <p className="mt-0.5 text-sm italic text-muted-foreground">
                      {ingesta.notas}
                    </p>
                  )}
                  {(ingesta.macros.carbohidratosG != null ||
                    ingesta.liquidosMl != null ||
                    ingesta.cafeinaMg != null) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        ingesta.macros.carbohidratosG != null &&
                          `${numero(ingesta.macros.carbohidratosG)} g de carbohidratos`,
                        ingesta.macros.calorias != null &&
                          `${ingesta.macros.calorias} kcal`,
                        ingesta.liquidosMl != null &&
                          `${ingesta.liquidosMl} ml`,
                        ingesta.cafeinaMg != null &&
                          `${numero(ingesta.cafeinaMg)} mg de cafeína`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {c &&
        (c.estrategiaPrevia || c.puestosAbastecimiento || c.recuperacion) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Antes y después</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Texto titulo="Estrategia previa" texto={c.estrategiaPrevia} />
              <Texto
                titulo="Puestos de abastecimiento"
                texto={c.puestosAbastecimiento}
              />
              <Texto titulo="Recuperación" texto={c.recuperacion} />
            </CardContent>
          </Card>
        )}
    </div>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  children,
}: {
  icono: typeof Flag;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5">
      <Icono className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{etiqueta}:</span>
      <span className="font-medium">{children}</span>
    </p>
  );
}

function Texto({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <div>
      <p className="font-medium">{titulo}</p>
      <p className="whitespace-pre-line text-muted-foreground">{texto}</p>
    </div>
  );
}
