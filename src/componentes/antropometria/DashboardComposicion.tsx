"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { PerfilPhantom } from "./PerfilPhantom";
import { Somatocarta, type PuntoSomatocarta } from "./Somatocarta";
import { useTemaComposicion } from "./useTemaComposicion";
import { AvisoFaltantes } from "./dashboard/AvisoFaltantes";
import { CabeceraMedicion } from "./dashboard/CabeceraMedicion";
import { IndicadoresCabecera } from "./dashboard/IndicadoresCabecera";
import { TarjetaGrasa } from "./dashboard/TarjetaGrasa";
import { TarjetaFraccionamiento } from "./dashboard/TarjetaFraccionamiento";
import { TarjetasEvolucion } from "./dashboard/TarjetasEvolucion";
import { TarjetaIndices } from "./dashboard/TarjetaIndices";
import { TarjetaEnergia } from "./dashboard/TarjetaEnergia";
import { TarjetaDistribucion } from "./dashboard/TarjetaDistribucion";

/**
 * Dashboard de composición corporal.
 *
 * Todo lo que se ve acá se recalcula desde las medidas crudas en el dominio;
 * el componente solo elige QUÉ medición mirar y cómo dibujarla. La medición
 * seleccionada por defecto es la última, y la comparación es siempre contra
 * la inmediatamente anterior.
 *
 * Lo que queda en este archivo es esa elección: cuál es la medición actual,
 * cuál la anterior, qué ecuación de grasa manda y en qué orden van las
 * tarjetas. El dibujo de cada una vive en `dashboard/`.
 */
export function DashboardComposicion({
  pacienteId,
  mediciones,
}: {
  pacienteId: string;
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

  // El protocolo decide qué modelo va primero: con DOS_COMPONENTES la grasa
  // por pliegues es lo que se midió, y el fraccionamiento de Kerr pasa a ser
  // el complemento. Con el resto, al revés.
  const dosComponentesPrimero = actual.protocolo === "DOS_COMPONENTES";
  const tarjetaGrasa = (
    <TarjetaGrasa
      actual={actual}
      anterior={anterior}
      grasaDestacada={grasaDestacada}
      tema={tema}
    />
  );
  const tarjetaPhantom = (
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
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <a
            href={`/api/pacientes/${pacienteId}/dashboard-antropometria-pdf?medicion=${actual.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown className="h-4 w-4" />
            PDF del dashboard
          </a>
        </Button>
      </div>

      <CabeceraMedicion
        actual={actual}
        anterior={anterior}
        mediciones={mediciones}
        alSeleccionar={setSeleccionadaId}
      />

      <AvisoFaltantes faltantes={resultado.faltantes} />

      <IndicadoresCabecera
        actual={actual}
        anterior={anterior}
        grasaDestacada={grasaDestacada}
        dosComponentesPrimero={dosComponentesPrimero}
        tema={tema}
      />

      {dosComponentesPrimero && tarjetaGrasa}

      {resultado.fraccionamiento && (
        <TarjetaFraccionamiento
          fraccionamiento={resultado.fraccionamiento}
          anterior={anterior?.resultado.fraccionamiento ?? null}
          tema={tema}
        />
      )}

      {!dosComponentesPrimero && tarjetaGrasa}

      {/* Índices y energía van ARRIBA de la evolución del % graso: son la
          lectura de la consulta de hoy, antes de mirar la serie histórica. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TarjetaIndices indices={resultado.indices} />
        <TarjetaEnergia energia={resultado.energia} />
      </div>

      <TarjetasEvolucion
        mediciones={mediciones}
        metodo={metodoDeSerie}
        metodosDisponibles={metodosDisponibles}
        alCambiarMetodo={setMetodoSerie}
        tema={tema}
      />

      {resultado.somatotipo ? (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
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

          {tarjetaPhantom}
        </div>
      ) : (
        tarjetaPhantom
      )}

      {/* Al final del todo y plegada: dónde está la adiposidad y el músculo
          es una lectura más fina que cuánto hay, y no todas las consultas
          la necesitan abierta. */}
      <TarjetaDistribucion distribucion={resultado.distribucion} tema={tema} />
    </div>
  );
}
