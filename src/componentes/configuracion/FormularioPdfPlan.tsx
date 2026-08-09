"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

const COLOR_DEFECTO = "#F4535E";

/** Editor de la apariencia del PDF del plan (membrete, color, pie y secciones). */
export function FormularioPdfPlan() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [subtitulo, setSubtitulo] = useState("");
  const [color, setColor] = useState(COLOR_DEFECTO);
  const [pie, setPie] = useState("");
  const [mostrarRecetas, setMostrarRecetas] = useState(true);
  const [mostrarMacros, setMostrarMacros] = useState(true);
  const [mostrarEquivalencias, setMostrarEquivalencias] = useState(true);
  const [mostrarRecomendaciones, setMostrarRecomendaciones] = useState(true);

  useEffect(() => {
    if (!config) return;
    setSubtitulo(config.pdfSubtitulo ?? "");
    setColor(config.pdfColorPrimario ?? COLOR_DEFECTO);
    setPie(config.pdfPieTexto ?? "");
    setMostrarRecetas(config.pdfMostrarRecetas);
    setMostrarMacros(config.pdfMostrarMacros);
    setMostrarEquivalencias(config.pdfMostrarEquivalencias);
    setMostrarRecomendaciones(config.pdfMostrarRecomendaciones);
  }, [config]);

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  function onGuardar() {
    guardar.mutate({
      pdfColorPrimario: color.trim() || null,
      pdfSubtitulo: subtitulo.trim() || null,
      pdfPieTexto: pie.trim() || null,
      pdfMostrarRecetas: mostrarRecetas,
      pdfMostrarMacros: mostrarMacros,
      pdfMostrarEquivalencias: mostrarEquivalencias,
      pdfMostrarRecomendaciones: mostrarRecomendaciones,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" /> Apariencia del PDF del plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Personalizá cómo se ve el PDF que descargás e imprimís. El membrete usa el nombre y la
          matrícula de la pestaña «Turnos y membrete». Los cambios se aplican al descargar
          cualquier plan.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="subtitulo">Subtítulo del membrete</Label>
            <Input
              id="subtitulo"
              placeholder="Ej: Nutrición deportiva y clínica"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="color">Color principal</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Elegir color"
                className="h-9 w-12 cursor-pointer rounded border"
                value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : COLOR_DEFECTO}
                onChange={(e) => setColor(e.target.value)}
              />
              <Input
                id="color"
                className="w-32"
                placeholder={COLOR_DEFECTO}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pie">Nota al pie (opcional)</Label>
          <Textarea
            id="pie"
            rows={2}
            placeholder="Ej: Este plan es orientativo. Ante dudas, consultá con tu profesional."
            value={pie}
            onChange={(e) => setPie(e.target.value)}
          />
        </div>

        <div className="space-y-2.5">
          <Label>Secciones a incluir</Label>
          <Casilla etiqueta="Recetas completas del plan" activo={mostrarRecetas} onCambio={setMostrarRecetas} />
          <Casilla etiqueta="Metas de macros" activo={mostrarMacros} onCambio={setMostrarMacros} />
          <Casilla etiqueta="Equivalencias" activo={mostrarEquivalencias} onCambio={setMostrarEquivalencias} />
          <Casilla
            etiqueta="Recomendaciones"
            activo={mostrarRecomendaciones}
            onCambio={setMostrarRecomendaciones}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" disabled={guardar.isPending} onClick={onGuardar}>
            Guardar apariencia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Casilla({
  etiqueta,
  activo,
  onCambio,
}: {
  etiqueta: string;
  activo: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={activo}
        onChange={(e) => onCambio(e.target.checked)}
      />
      {etiqueta}
    </label>
  );
}
