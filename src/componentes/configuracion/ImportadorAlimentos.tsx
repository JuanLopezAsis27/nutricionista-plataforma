"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, CheckCircle2, Upload, Trash2 } from "lucide-react";
import { useAlimentosPropios } from "@/lib/hooks/useAlimentosPropios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Importa un Excel/CSV de alimentos con sus macros. Si hay una lista cargada, la
 * búsqueda de ingredientes usa ESA lista y FatSecret queda desactivado.
 */
export function ImportadorAlimentos() {
  const { estado, importar, importando, vaciar } = useAlimentosPropios();
  const consulta = estado();
  const e = consulta.data;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    try {
      const importados = await importar(archivo);
      toast.success(
        `${importados} alimentos importados. FatSecret queda desactivado.`,
      );
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo importar.";
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Mis alimentos
            (Excel)
          </span>
          {consulta.isLoading ? null : e?.activo ? (
            <span className="flex items-center gap-1 text-xs font-normal text-primary">
              <CheckCircle2 className="h-4 w-4" /> {e.cantidad} cargados
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Subí un <strong>Excel (.xlsx) o CSV</strong> con tus alimentos e
          insumos y sus macros. Si cargás una lista, la búsqueda de ingredientes
          usa <strong>solo esa lista</strong> y se{" "}
          <strong>desactiva FatSecret</strong> (no se consulta ninguna API
          externa).
        </p>
        <p className="text-xs text-muted-foreground">
          Columnas esperadas (con encabezado, en cualquier orden):{" "}
          <code>Nombre</code>, <code>Marca</code> (opcional),{" "}
          <code>Calorías</code>, <code>Proteínas</code>,{" "}
          <code>Carbohidratos</code>, <code>Grasas</code>. Los valores se toman
          por 100 g.
        </p>

        {consulta.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            {e?.activo && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Tenés <strong>{e.cantidad}</strong> alimentos cargados.
                  FatSecret está desactivado. Volvé a subir un archivo para
                  reemplazar la lista.
                </span>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(ev) =>
                void alElegir(ev.target.files?.[0] ?? undefined)
              }
            />
            <div className="flex flex-wrap justify-end gap-2">
              {e?.activo && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={vaciar.isPending || importando}
                  onClick={() => vaciar.mutate()}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Quitar lista
                </Button>
              )}
              <Button
                type="button"
                disabled={importando}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {importando
                  ? "Importando…"
                  : e?.activo
                    ? "Reemplazar lista"
                    : "Subir Excel/CSV"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
