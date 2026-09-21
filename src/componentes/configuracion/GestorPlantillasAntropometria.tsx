"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Layers,
  LayoutTemplate,
} from "lucide-react";
import type { PlantillaAntropometricaDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  MINIMO_PARA_SERVIR,
  REQUISITOS_RESULTADO,
  ETIQUETAS_CAMPO_PLANTILLA,
  alcanceDe,
  type AlcancePlantilla,
  type CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { PLANTILLAS_BASE } from "@/dominio/entidades/plantillasBase";
import {
  ETIQUETAS_PROTOCOLO,
  protocolosQueAdmite,
} from "@/dominio/entidades/protocolosMedicion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { PanelAlcanceCampos } from "./PanelAlcanceCampos";
import { SelectorCamposMedicion } from "./SelectorCamposMedicion";

/**
 * Plantillas de carga del consultorio.
 *
 * Son el tercer juego de campos, además de los dos protocolos: una plantilla
 * no tiene que resolver nada en particular —le alcanza con resolver ALGO—,
 * así que es donde entran las cargas cortas y los sitios de fuera del ISAK.
 * Aparecen en el desplegable de toda medición nueva.
 *
 * El flujo es el que pidió el profesional: se parte de una plantilla de
 * fábrica y se destilda lo que no se usa. Mientras se destilda, el panel de
 * alcance dice en vivo qué se sigue pudiendo calcular y qué se pierde, así la
 * poda no es a ciegas.
 */
export function GestorPlantillasAntropometria() {
  const { obtenerPlantillas, eliminarPlantilla } = useEvaluacion();
  const consulta = obtenerPlantillas();

  const [editando, setEditando] = useState<PlantillaAntropometricaDto | null>(
    null,
  );
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] =
    useState<PlantillaAntropometricaDto | null>(null);

  if (consulta.isLoading) return <Skeleton className="h-40 w-full" />;

  const plantillas = consulta.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Plantillas de carga</h3>
          <p className="text-sm text-muted-foreground">
            Juegos de campos propios, además de los dos protocolos. Aparecen
            para elegir en cada medición nueva, con los protocolos a los que le
            alcanzan: una plantilla que no resuelve el fraccionamiento no se
            puede usar con 5 componentes. Partí de una de las nuestras y sacá lo
            que no midas.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {plantillas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no tenés plantillas propias. El formulario de medición pide
          los campos del protocolo elegido hasta que crees una.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {plantillas.map((plantilla) => (
            <Card key={plantilla.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                      {plantilla.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plantilla.campos.length} campos
                      {plantilla.descripcion && ` · ${plantilla.descripcion}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${plantilla.nombre}`}
                      onClick={() => {
                        setEditando(plantilla);
                        setAbierto(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${plantilla.nombre}`}
                      onClick={() => setEliminando(plantilla)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ProtocolosQueAdmite campos={plantilla.campos} />
                <ResumenAlcance alcance={plantilla.alcance} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar «${editando.nombre}»`
                : "Nueva plantilla de carga"}
            </DialogTitle>
          </DialogHeader>
          <EditorPlantilla
            plantillaInicial={editando}
            onTerminado={() => setAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar plantilla"
        descripcion={`¿Eliminar «${eliminando?.nombre}»? Las mediciones ya cargadas no se tocan.`}
        cargando={eliminarPlantilla.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarPlantilla.mutate(
              { id: eliminando.id },
              { onSuccess: () => setEliminando(null) },
            );
          }
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}

function EditorPlantilla({
  plantillaInicial,
  onTerminado,
}: {
  plantillaInicial: PlantillaAntropometricaDto | null;
  onTerminado: () => void;
}) {
  const { guardarPlantilla } = useEvaluacion();
  const [nombre, setNombre] = useState(plantillaInicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(
    plantillaInicial?.descripcion ?? "",
  );
  const [campos, setCampos] = useState<Set<CampoPlantilla>>(
    new Set(plantillaInicial?.campos ?? PLANTILLAS_BASE[0]!.campos),
  );
  const [error, setError] = useState<string | null>(null);

  // El panel se recalcula en cada tilde sobre la MISMA tabla de requisitos que
  // usa la validación del servidor, así que lo que promete es lo que se acepta.
  const seleccionados = [...campos];
  const alcance = alcanceDe(seleccionados);
  const sirve = alcance.metodosGrasa.length > 0 || alcance.cincoMasas;
  const faltaParaServir = MINIMO_PARA_SERVIR.filter(
    (campo) => !campos.has(campo),
  ).map((campo) => ETIQUETAS_CAMPO_PLANTILLA[campo]);

  const alternar = (campo: CampoPlantilla) => {
    setCampos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(campo)) siguiente.delete(campo);
      else siguiente.add(campo);
      return siguiente;
    });
    setError(null);
  };

  function guardar() {
    if (nombre.trim().length === 0) {
      setError("La plantilla necesita un nombre.");
      return;
    }
    if (!sirve) {
      setError(
        `Con estos campos no se calcula ningún resultado. Falta ${faltaParaServir
          .join(", ")
          .toLowerCase()}.`,
      );
      return;
    }

    guardarPlantilla.mutate(
      {
        ...(plantillaInicial ? { id: plantillaInicial.id } : {}),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        campos: seleccionados,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <div className="space-y-5">
      {!plantillaInicial && (
        <div className="space-y-2">
          <Label className="text-xs">Partir de una plantilla</Label>
          <div className="flex flex-wrap gap-2">
            {PLANTILLAS_BASE.map((base) => (
              <Button
                key={base.clave}
                type="button"
                variant="outline"
                size="sm"
                title={base.descripcion}
                onClick={() => {
                  setCampos(new Set(base.campos));
                  if (nombre.trim().length === 0) setNombre(base.nombre);
                  setError(null);
                }}
              >
                {base.nombre}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nombre-plantilla" className="text-xs">
            Nombre
          </Label>
          <Input
            id="nombre-plantilla"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Consulta rápida"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="descripcion-plantilla" className="text-xs">
            Descripción (opcional)
          </Label>
          <Textarea
            id="descripcion-plantilla"
            rows={1}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        El <span className="font-medium">peso</span> y la{" "}
        <span className="font-medium">fecha</span> van siempre: no se pueden
        quitar.
      </p>

      <SelectorCamposMedicion campos={campos} onAlternar={alternar} />

      <div className="space-y-2">
        <ProtocolosQueAdmite campos={seleccionados} />
        <PanelAlcanceCampos campos={seleccionados} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onTerminado}
          disabled={guardarPlantilla.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={guardar}
          disabled={guardarPlantilla.isPending || !sirve}
        >
          {guardarPlantilla.isPending ? "Guardando…" : "Guardar plantilla"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Con qué protocolos se puede cargar usando esta plantilla.
 *
 * Los dos protocolos son las plantillas principales y una propia se acomoda a
 * la que le da el cuero. Decirlo acá, mientras se arma, es lo que evita la
 * sorpresa de encontrarla deshabilitada en el modal de medición sin entender
 * por qué: el motivo es el mismo panel de abajo.
 */
function ProtocolosQueAdmite({
  campos,
}: {
  campos: readonly CampoPlantilla[];
}) {
  const admitidos = protocolosQueAdmite(campos);
  if (admitidos.length === 0) return null;

  return (
    <p className="flex items-start gap-1.5 text-xs">
      <Layers
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
        aria-hidden
      />
      <span>
        Se puede usar con:{" "}
        <span className="font-medium">
          {admitidos.map((p) => ETIQUETAS_PROTOCOLO[p]).join(" · ")}
        </span>
        {!admitidos.includes("CINCO_COMPONENTES") && (
          <span className="block text-muted-foreground">
            Para 5 componentes le faltan medidas del fraccionamiento de Kerr.
          </span>
        )}
      </span>
    </p>
  );
}

/** Resumen compacto de una plantilla ya guardada (alcance calculado en el servidor). */
function ResumenAlcance({ alcance }: { alcance: AlcancePlantilla }) {
  const sirve = alcance.metodosGrasa.length > 0 || alcance.cincoMasas;
  if (!sirve) {
    return (
      <p className="text-xs text-destructive">
        Esta plantilla no alcanza para calcular nada.
      </p>
    );
  }

  const etiquetas = [
    ...alcance.metodosGrasa.map(
      ({ metodo, sexo }) =>
        (REQUISITOS_RESULTADO.find((r) => r.clave === metodo)?.etiqueta ??
          metodo) +
        (sexo === "AMBOS"
          ? ""
          : sexo === "FEMENINO"
            ? " (mujeres)"
            : " (varones)"),
    ),
    ...(alcance.cincoMasas ? ["5 masas (Kerr)"] : []),
    ...(alcance.somatotipo ? ["Somatotipo"] : []),
  ];

  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span>{etiquetas.join(" · ")}</span>
    </p>
  );
}
