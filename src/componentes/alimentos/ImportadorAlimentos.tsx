"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  CheckCircle2,
  Upload,
  Trash2,
  FileDown,
} from "lucide-react";
import { useAlimentosPropios } from "@/lib/hooks/useAlimentosPropios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { mensajeDeError } from "@/lib/errores";

/**
 * Importa un Excel/CSV de alimentos con sus macros. Si hay una lista cargada, la
 * búsqueda de ingredientes usa ESA lista y no se consulta ninguna API externa.
 *
 * Sirve a la lista del consultorio y a la predeterminada de la plataforma
 * (`origen="plataforma"`, solo SUPERADMIN): misma planilla, otro dueño.
 */
export function ImportadorAlimentos({
  origen = "consultorio",
}: {
  origen?: "consultorio" | "plataforma";
}) {
  const deLaPlataforma = origen === "plataforma";
  const { estado, importar, importando, vaciar } = useAlimentosPropios(origen);
  const consulta = estado();
  const e = consulta.data;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    try {
      const { importados, repetidos, enPlataforma } = await importar(archivo);
      // Las filas repetidas no frenan la importación (queda la última), pero
      // se dicen: si la planilla tenía el mismo alimento dos veces, el
      // profesional tiene que saber que uno quedó afuera.
      const aviso =
        repetidos > 0
          ? ` ${repetidos} ${repetidos === 1 ? "fila repetía" : "filas repetían"} un alimento y se descart${repetidos === 1 ? "ó" : "aron"} (quedó la última).`
          : "";
      // Coincidir con la plataforma no es un error (puede ser su versión, con
      // otros macros), pero conviene saberlo: si los macros son los mismos,
      // esas filas no aportan nada.
      const coincidencias =
        enPlataforma > 0
          ? ` ${enPlataforma} ya ${enPlataforma === 1 ? "existía" : "existían"} en la plataforma: en tu buscador aparece tu versión.`
          : "";
      toast.success(
        (deLaPlataforma
          ? `${importados} alimentos importados al catálogo de la plataforma.`
          : `${importados} alimentos importados.`) +
          aviso +
          coincidencias,
        { duration: coincidencias || aviso ? 10_000 : undefined },
      );
    } catch (err) {
      const mensaje = mensajeDeError(err, "No se pudo importar.");
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
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {deLaPlataforma
              ? "Alimentos predeterminados (Excel)"
              : "Mis alimentos (Excel)"}
          </span>
          {consulta.isLoading ? null : e?.activo ? (
            <span className="flex items-center gap-1 text-xs font-normal text-primary">
              <CheckCircle2 className="h-4 w-4" /> {e.cantidad} cargados
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deLaPlataforma ? (
          <p className="text-sm text-muted-foreground">
            Subí un <strong>Excel (.xlsx) o CSV</strong> con los alimentos que
            ven <strong>todos los consultorios</strong> en el buscador. Cada
            profesional puede sumar los suyos, que quedan solo para él.
            Reemplaza el catálogo anterior; los planes y recetas que ya usan un
            alimento no cambian, porque copian sus macros al elegirlo.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Subí un <strong>Excel (.xlsx) o CSV</strong> con tus alimentos e
            insumos y sus macros. Se suman a los predeterminados de la
            plataforma, quedan solo para vos y aparecen primero en el buscador.
            Si hay alimentos cargados (tuyos o predeterminados),{" "}
            <strong>no se consulta ninguna API externa</strong>.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Columnas esperadas (con encabezado, en cualquier orden):{" "}
          <code>Nombre</code>, <code>Marca</code> (opcional),{" "}
          <code>Calorías</code>, <code>Proteínas</code>,{" "}
          <code>Carbohidratos</code>, <code>Grasas</code> y{" "}
          <code>Categoría</code> (opcional: Carnes, Lácteos, Cereales, Frutas…).
          Los valores se toman por 100 g. Al reemplazar la lista, los alimentos
          que ya estaban conservan su imagen (y su categoría si la planilla no
          trae una).
        </p>

        <Button variant="outline" size="sm" asChild>
          <a href="/api/alimentos/plantilla" download>
            <FileDown className="mr-1.5 h-4 w-4" />
            Descargar modelo de Excel
          </a>
        </Button>

        {consulta.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            {e?.activo && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Hay <strong>{e.cantidad}</strong> alimentos cargados. Volvé a
                  subir un archivo para reemplazar la lista.
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
