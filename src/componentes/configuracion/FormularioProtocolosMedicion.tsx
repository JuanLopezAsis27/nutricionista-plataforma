"use client";

import { useState } from "react";
import { Ruler, RotateCcw } from "lucide-react";
import type { ProtocoloComposicion } from "@/dominio/entidades/Antropometria";
import {
  REQUERIDOS_CINCO_MASAS,
  type CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";
import {
  CAMPOS_PROTOCOLO_POR_DEFECTO,
  ETIQUETAS_PROTOCOLO,
  faltaParaElProtocolo,
} from "@/dominio/entidades/protocolosMedicion";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { PanelAlcanceCampos } from "./PanelAlcanceCampos";
import { SelectorCamposMedicion } from "./SelectorCamposMedicion";

/** Lo que cada protocolo viene a contestar, y su piso. */
const DESCRIPCIONES: Record<
  ProtocoloComposicion,
  { detalle: string; piso: string }
> = {
  DOS_COMPONENTES: {
    detalle:
      "El protocolo habitual de consulta: reparte el peso en graso y no " +
      "graso con las ecuaciones de pliegues.",
    piso:
      "Tiene que quedar al menos una ecuación de masa adiposa o grasa en " +
      "pie. Sin ninguna, la medición no arroja ningún porcentaje.",
  },
  CINCO_COMPONENTES: {
    detalle:
      "El perfil ISAK: fracciona el peso en las 5 masas de Kerr, con el " +
      "somatotipo y el perfil Phantom.",
    piso:
      "Las medidas que exige el fraccionamiento de Kerr no se pueden sacar: " +
      "sin ellas el protocolo deja de arrojar lo único que lo distingue.",
  },
};

/** Bloqueadas: sacarlas dejaría al protocolo sin su resultado propio. */
const BLOQUEADOS: Record<ProtocoloComposicion, ReadonlySet<CampoPlantilla>> = {
  DOS_COMPONENTES: new Set(),
  CINCO_COMPONENTES: new Set(REQUERIDOS_CINCO_MASAS),
};

/**
 * Qué medidas pide el formulario de carga en cada protocolo.
 *
 * Son dos listas independientes y se guardan por separado: alguien que recorta
 * la carga de todos los días (2 componentes) no tiene por qué tocar el perfil
 * completo, y un guardado único obligaría a revisar los dos para cambiar uno.
 */
export function FormularioProtocolosMedicion() {
  const { obtener } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada protocolo pide las medidas que elijas acá, en todas las cargas del
        consultorio. Se pueden sacar las que no midas, mientras el protocolo
        siga arrojando lo suyo: el panel de la derecha dice, en vivo, qué deja
        de calcularse con cada medida que destildes.
      </p>

      {/* La `key` es el CONTENIDO de la lista guardada: el editor trabaja
          sobre una copia local, y cuando lo guardado cambia (el guardado
          propio, o un cambio desde otra pestaña) hay que rearrancar con lo
          nuevo. Va por key y no por un efecto que resincronice porque un
          refetch que devuelve lo mismo no tiene que borrar lo que se está
          destildando, y con la identidad del array lo borraría. */}
      <EditorProtocolo
        key={config.camposDosComponentes.join(",")}
        protocolo="DOS_COMPONENTES"
        guardados={config.camposDosComponentes}
      />
      <EditorProtocolo
        key={config.camposCincoComponentes.join(",")}
        protocolo="CINCO_COMPONENTES"
        guardados={config.camposCincoComponentes}
      />
    </div>
  );
}

function EditorProtocolo({
  protocolo,
  guardados,
}: {
  protocolo: ProtocoloComposicion;
  guardados: CampoPlantilla[];
}) {
  const { guardar } = useConfiguracion();
  // Copia local: se monta con lo guardado y el padre lo rearranca por `key`
  // cuando lo guardado cambia.
  const [campos, setCampos] = useState<Set<CampoPlantilla>>(new Set(guardados));

  const elegidos = [...campos];
  const falta = faltaParaElProtocolo(protocolo, elegidos);
  const sirve = falta.length === 0;
  const porDefecto = CAMPOS_PROTOCOLO_POR_DEFECTO[protocolo];
  const esPorDefecto =
    elegidos.length === porDefecto.length &&
    porDefecto.every((campo) => campos.has(campo));
  const sinCambios =
    elegidos.length === guardados.length &&
    guardados.every((campo) => campos.has(campo));

  const alternar = (campo: CampoPlantilla) =>
    setCampos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(campo)) siguiente.delete(campo);
      else siguiente.add(campo);
      return siguiente;
    });

  function onGuardar() {
    if (!sirve) return;
    guardar.mutate(
      protocolo === "CINCO_COMPONENTES"
        ? { camposCincoComponentes: elegidos }
        : { camposDosComponentes: elegidos },
    );
  }

  return (
    // `region` con el nombre del protocolo: son dos editores idénticos uno
    // debajo del otro y sin esto no hay forma de decir de cuál de los dos es
    // un campo, ni leyendo con un lector de pantalla ni desde una test.
    <Card role="region" aria-label={ETIQUETAS_PROTOCOLO[protocolo]}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-5 w-5 text-primary" />
          {ETIQUETAS_PROTOCOLO[protocolo]}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {DESCRIPCIONES[protocolo].detalle}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          El <span className="font-medium">peso</span> y la{" "}
          <span className="font-medium">fecha</span> van siempre: no se pueden
          quitar. {DESCRIPCIONES[protocolo].piso}
        </p>

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
          <SelectorCamposMedicion
            campos={campos}
            onAlternar={alternar}
            bloqueados={BLOQUEADOS[protocolo]}
            motivoBloqueo="La exige el fraccionamiento en 5 masas de Kerr: sin ella este protocolo deja de arrojar su resultado."
          />
          <PanelAlcanceCampos campos={elegidos} />
        </div>

        {!sirve && (
          <p className="text-sm text-destructive">
            {protocolo === "CINCO_COMPONENTES"
              ? "Falta "
              : "No queda ninguna ecuación de grasa. Falta "}
            {falta.join(", ").toLowerCase()}.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={esPorDefecto || guardar.isPending}
            onClick={() => setCampos(new Set(porDefecto))}
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>
          <Button
            type="button"
            disabled={!sirve || sinCambios || guardar.isPending}
            onClick={onGuardar}
          >
            Guardar protocolo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
