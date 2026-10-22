"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  CheckCircle2,
  Upload,
  Trash2,
  FileDown,
  Download,
  Replace,
} from "lucide-react";
import {
  useAlimentosPropios,
  URL_EXPORTAR,
} from "@/lib/hooks/useAlimentosPropios";
import type {
  ModoImportacionAlimentosDto,
  ResultadoImportacionAlimentosDto,
} from "@/aplicacion/dtos/alimentoPropio.dto";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  LADO_MAXIMO_IMAGEN_ALIMENTO,
  TAMANO_MAXIMO_IMAGEN_ALIMENTO,
} from "@/dominio/entidades/AlimentoPropio";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { mensajeDeError } from "@/lib/errores";

/**
 * Importa un Excel/CSV de alimentos con sus macros, reemplazando la lista o
 * agregándole, y descarga la lista entera en el mismo formato. Si hay una
 * lista cargada, la búsqueda de ingredientes usa ESA lista y no se consulta
 * ninguna API externa.
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
  /** Con qué modo se abrió el selector de archivo. */
  const modoElegido = useRef<ModoImportacionAlimentosDto>("AGREGAR");
  /** El archivo para reemplazar, esperando la confirmación. */
  const [porReemplazar, setPorReemplazar] = useState<File | null>(null);

  function elegirArchivo(modo: ModoImportacionAlimentosDto) {
    modoElegido.current = modo;
    inputRef.current?.click();
  }

  function alElegir(archivo: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!archivo) return;
    // Reemplazar borra lo que no esté en la planilla: se confirma nombrando
    // el archivo, ahora que los dos botones están uno al lado del otro.
    if (modoElegido.current === "REEMPLAZAR" && e?.activo) {
      setPorReemplazar(archivo);
      return;
    }
    void subir(archivo, modoElegido.current);
  }

  async function subir(archivo: File, modo: ModoImportacionAlimentosDto) {
    setError(null);
    try {
      const resultado = await importar(archivo, modo);
      const mensaje = mensajeDeResultado(resultado, deLaPlataforma);
      toast.success(mensaje.texto, {
        duration: mensaje.largo ? 10_000 : undefined,
      });
    } catch (err) {
      const mensaje = mensajeDeError(err, "No se pudo importar.");
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setPorReemplazar(null);
    }
  }

  const urlExportar = URL_EXPORTAR[origen];

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
            profesional puede sumar los suyos, que quedan solo para él. Los
            planes y recetas que ya usan un alimento no cambian, porque copian
            sus macros al elegirlo.
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
          Los valores se toman por 100 g, o por 100 ml si la columna opcional{" "}
          <code>Unidad</code> dice <code>ml</code> (leche, aceite, jugos). La
          columna opcional <code>Medidas</code> trae las medidas caseras
          separadas por punto y coma, en g o ml según la unidad:{" "}
          <code>1 taza = 240; 1 cucharada = 15</code> o{" "}
          <code>1 unidad = 50</code>. En la columna opcional <code>Imagen</code>{" "}
          va la foto del alimento, insertada en la celda (Insertar › Imágenes ›
          Colocar en celda) o sobre ella: JPG, PNG o WebP de hasta{" "}
          {TAMANO_MAXIMO_IMAGEN_ALIMENTO / 1024 / 1024} MB cada una, que se
          guardan reducidas a {LADO_MAXIMO_IMAGEN_ALIMENTO} px. El archivo
          completo puede pesar hasta 20 MB; un CSV no lleva imágenes.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            <strong>Agregar</strong> suma los alimentos que no estaban. Los que
            ya están en {deLaPlataforma ? "el catálogo" : "tu lista"} (mismo
            nombre y marca, sin contar mayúsculas ni tildes) no se tocan.
            {!deLaPlataforma &&
              " Uno igual a un predeterminado sí entra: es tu versión."}
          </li>
          <li>
            <strong>Reemplazar</strong> deja{" "}
            {deLaPlataforma ? "el catálogo" : "tu lista"} igual a la planilla.
            Los que ya estaban conservan su imagen (y su categoría, unidad y
            medidas si la planilla no las trae).
          </li>
          <li>
            <strong>Descargar</strong> baja{" "}
            {deLaPlataforma
              ? "el catálogo entero"
              : "tus alimentos y los predeterminados, en dos pestañas"}{" "}
            con las mismas columnas, para editar
            {deLaPlataforma ? "lo" : " la primera"} y volver a subir
            {deLaPlataforma ? "lo" : "la"}.
          </li>
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/alimentos/plantilla" download>
              <FileDown className="mr-1.5 h-4 w-4" />
              Descargar modelo de Excel
            </a>
          </Button>
          {urlExportar && (
            <Button variant="outline" size="sm" asChild>
              <a href={urlExportar} download>
                <Download className="mr-1.5 h-4 w-4" />
                {deLaPlataforma
                  ? "Descargar catálogo (Excel)"
                  : "Descargar todos los alimentos (Excel)"}
              </a>
            </Button>
          )}
        </div>

        {consulta.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            {e?.activo && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Hay <strong>{e.cantidad}</strong> alimentos cargados. Podés
                  agregar otros desde un Excel o reemplazar la lista entera.
                </span>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(ev) => alElegir(ev.target.files?.[0] ?? undefined)}
            />
            <div className="flex flex-wrap justify-end gap-2">
              {e?.activo && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={vaciar.isPending || importando}
                    onClick={() => vaciar.mutate()}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Quitar lista
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importando}
                    onClick={() => elegirArchivo("REEMPLAZAR")}
                  >
                    <Replace className="mr-1.5 h-4 w-4" /> Reemplazar lista
                  </Button>
                </>
              )}
              <Button
                type="button"
                disabled={importando}
                onClick={() => elegirArchivo("AGREGAR")}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {importando
                  ? "Importando…"
                  : e?.activo
                    ? "Agregar desde Excel/CSV"
                    : "Subir Excel/CSV"}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <ModalConfirmacion
        abierto={porReemplazar !== null}
        titulo={
          deLaPlataforma ? "¿Reemplazar el catálogo?" : "¿Reemplazar tu lista?"
        }
        descripcion={`${deLaPlataforma ? "El catálogo" : "Tu lista"} va a quedar igual a «${porReemplazar?.name ?? ""}»: los ${e?.cantidad ?? 0} alimentos que no estén en la planilla se borran. Los planes y recetas que ya los usan no cambian. Si solo querés sumar alimentos, usá «Agregar».`}
        textoConfirmar="Reemplazar"
        cargando={importando}
        onConfirmar={() =>
          porReemplazar && void subir(porReemplazar, "REEMPLAZAR")
        }
        onCancelar={() => setPorReemplazar(null)}
      />
    </Card>
  );
}

/** El aviso de cómo salió la importación. */
function mensajeDeResultado(
  r: ResultadoImportacionAlimentosDto,
  deLaPlataforma: boolean,
): { texto: string; largo: boolean } {
  const partes: string[] = [];
  if (r.modo === "AGREGAR") {
    partes.push(
      r.importados === 1
        ? "1 alimento agregado."
        : `${r.importados} alimentos agregados.`,
    );
  } else {
    partes.push(
      deLaPlataforma
        ? `${r.importados} alimentos importados al catálogo de la plataforma.`
        : `${r.importados} alimentos importados.`,
    );
  }
  // Los que ya estaban no se tocan, pero se dicen con el nombre de la lista:
  // si el profesional esperaba macros nuevos, tiene que saber cuáles editar.
  if (r.yaEstaban > 0) {
    const resto = r.yaEstaban - r.ejemplosYaEstaban.length;
    const nombres =
      r.ejemplosYaEstaban.map((n) => `«${n}»`).join(", ") +
      (resto > 0 ? ` y ${resto} más` : "");
    partes.push(
      `${r.yaEstaban === 1 ? "1 ya estaba" : `${r.yaEstaban} ya estaban`} en la lista y no se ${r.yaEstaban === 1 ? "tocó" : "tocaron"}: ${nombres}.`,
    );
  }
  // Las filas repetidas no frenan la importación (queda la última), pero se
  // dicen: si la planilla tenía el mismo alimento dos veces, uno quedó afuera.
  if (r.repetidos > 0) {
    partes.push(
      `${r.repetidos} ${r.repetidos === 1 ? "fila repetía" : "filas repetían"} un alimento de la planilla y se descart${r.repetidos === 1 ? "ó" : "aron"} (quedó la última).`,
    );
  }
  // Coincidir con la plataforma no es un error (puede ser su versión, con
  // otros macros), pero conviene saberlo: si los macros son los mismos, esas
  // filas no aportan nada.
  if (r.enPlataforma > 0) {
    partes.push(
      `${r.enPlataforma} ya ${r.enPlataforma === 1 ? "existía" : "existían"} en la plataforma: en tu buscador aparece tu versión.`,
    );
  }
  if (r.imagenes.cargadas > 0) {
    partes.push(
      r.imagenes.cargadas === 1
        ? "Se cargó 1 imagen."
        : `Se cargaron ${r.imagenes.cargadas} imágenes.`,
    );
  }
  // Una imagen que no cumple no frena la importación: el alimento entró sin
  // ella, y se dice cuál y por qué para poder cargarla a mano.
  const { descartadas } = r.imagenes;
  if (descartadas.length > 0) {
    const resto = descartadas.length - 3;
    partes.push(
      `${descartadas.length === 1 ? "1 imagen no se cargó" : `${descartadas.length} imágenes no se cargaron`}: ${descartadas.slice(0, 3).join("; ")}${resto > 0 ? ` y ${resto} más` : ""}.`,
    );
  }
  return { texto: partes.join(" "), largo: partes.length > 1 };
}
