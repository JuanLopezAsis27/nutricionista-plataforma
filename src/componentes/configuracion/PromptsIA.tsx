"use client";

import { useState } from "react";
import {
  ChevronDown,
  Eye,
  MessageSquareCode,
  RotateCcw,
  Users,
} from "lucide-react";
import type { PromptIADto } from "@/aplicacion/dtos/promptsIA.dto";
import { usePromptsIA } from "@/lib/hooks/usePromptsIA";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";

/**
 * Instrucciones (system prompts) de cada funcionalidad de IA.
 *
 * La lista se ve PLEGADA y el texto largo vive en un modal, a propósito: son
 * siete prompts de hasta cinco mil caracteres cada uno, y desplegados de una
 * empujaban la clave de API y los criterios de ingredientes tan abajo que la
 * pestaña dejaba de servir para lo que se entra a hacer casi siempre, que es
 * cargar una credencial.
 *
 * Cada fila explica primero QUÉ toca —dónde se usa, quién lee la salida, qué
 * pasa si se cambia— porque el texto solo no alcanza para saberlo: el prompt
 * del asistente del paciente y el de la lectura de planillas se parecen mucho
 * en la pantalla y no se parecen en nada en las consecuencias.
 */
export function PromptsIA() {
  const { listar } = usePromptsIA();
  const consulta = listar();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<PromptIADto | null>(null);

  if (consulta.isLoading || !consulta.data) {
    return <Skeleton className="h-48 w-full" />;
  }

  const personalizados = consulta.data.filter((p) => p.personalizado).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <MessageSquareCode className="h-5 w-5 text-primary" /> Instrucciones
            de la IA
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {personalizados === 0
              ? "Todas originales"
              : `${personalizados} de ${consulta.data.length} personalizadas`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cada funcionalidad de IA le da al modelo un texto de instrucciones
          propio: qué papel cumple, con qué tono responde y qué no puede hacer.
          Podés reescribirlo para adaptarlo a cómo trabaja tu consultorio.
          Tocando una de la lista se explica a qué corresponde; el texto se
          edita en una ventana aparte y siempre podés volver al original.
        </p>

        <div className="divide-y rounded-md border">
          {consulta.data.map((prompt) => (
            <Fila
              key={prompt.clave}
              prompt={prompt}
              expandida={abierta === prompt.clave}
              onAlternar={() =>
                setAbierta(abierta === prompt.clave ? null : prompt.clave)
              }
              onEditar={() => setEditando(prompt)}
            />
          ))}
        </div>
      </CardContent>

      {/* Montado solo mientras hay algo abierto, y con `key`: así el cuadro de
          texto arranca del prompt elegido sin tener que sincronizarlo después.
          Se cierra al guardar —queda sobre una copia vieja— y lo que refresca
          la lista es la invalidación del hook. */}
      {editando && (
        <ModalPrompt
          key={editando.clave}
          prompt={editando}
          onCerrar={() => setEditando(null)}
          alGuardar={() => setEditando(null)}
        />
      )}
    </Card>
  );
}

/** Una funcionalidad: siempre visible el título, desplegable la explicación. */
function Fila({
  prompt,
  expandida,
  onAlternar,
  onEditar,
}: {
  prompt: PromptIADto;
  expandida: boolean;
  onAlternar: () => void;
  onEditar: () => void;
}) {
  const { restablecer } = usePromptsIA();
  const propio = prompt.personalizado != null;

  return (
    <div>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={expandida}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            expandida ? "rotate-180" : ""
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{prompt.titulo}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {prompt.donde}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
            propio
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {propio ? "Personalizada" : "Original"}
        </span>
      </button>

      {expandida && (
        <div className="space-y-3 border-t bg-muted/30 px-3 py-3 pl-10">
          <p className="text-sm text-muted-foreground">{prompt.descripcion}</p>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-medium">Quién lee la respuesta:</span>{" "}
              {prompt.audiencia}
            </span>
          </p>

          {prompt.variables.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">
                Datos que la app completa sola:
              </p>
              <ul className="space-y-0.5">
                {prompt.variables.map((variable) => (
                  <li
                    key={variable.nombre}
                    className="text-xs text-muted-foreground"
                  >
                    <code className="rounded bg-background px-1 py-0.5 text-[11px]">
                      {`{{${variable.nombre}}}`}
                    </code>{" "}
                    — {variable.descripcion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEditar}
            >
              <Eye className="h-4 w-4" />
              {propio ? "Ver y editar" : "Ver y personalizar"}
            </Button>
            {propio && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={restablecer.isPending}
                onClick={() => restablecer.mutate({ clave: prompt.clave })}
              >
                <RotateCcw className="h-4 w-4" />
                Restablecer la original
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Edición del texto, en un modal.
 *
 * Arranca SIEMPRE con un texto cargado —el propio o el de fábrica— y nunca en
 * blanco: reescribir un prompt es casi siempre corregir dos líneas del que ya
 * anda, y un cuadro vacío invita a redactar de cero uno peor.
 */
function ModalPrompt({
  prompt,
  onCerrar,
  alGuardar,
}: {
  prompt: PromptIADto;
  onCerrar: () => void;
  alGuardar: () => void;
}) {
  const { guardar, restablecer } = usePromptsIA();
  const [texto, setTexto] = useState(prompt.personalizado ?? prompt.porDefecto);

  const original = prompt.porDefecto.trim();
  const sinCambios = texto.trim() === (prompt.personalizado ?? original).trim();
  const esOriginal = texto.trim() === original;

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{prompt.titulo}</DialogTitle>
          <DialogDescription>
            {prompt.donde} · {prompt.audiencia}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            aria-label={`Instrucciones de ${prompt.titulo}`}
            className="min-h-[45vh] font-mono text-xs leading-relaxed"
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {prompt.variables.length > 0 ? (
              <>
                Los{" "}
                {prompt.variables.map((variable, indice) => (
                  <span key={variable.nombre}>
                    {indice > 0 && ", "}
                    <code className="rounded bg-muted px-1 py-0.5">
                      {`{{${variable.nombre}}}`}
                    </code>
                  </span>
                ))}{" "}
                los reemplaza la app con los datos de cada llamada. Si los
                borrás, el modelo deja de recibir ese dato.{" "}
              </>
            ) : (
              <>Este prompt no recibe datos variables. </>
            )}
            {texto.trim().length} de 20.000 caracteres.
          </p>
        </div>

        <DialogFooter>
          {!esOriginal && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTexto(prompt.porDefecto)}
            >
              <RotateCcw className="h-4 w-4" />
              Volver al texto original
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              guardar.isPending ||
              restablecer.isPending ||
              sinCambios ||
              texto.trim().length < 20
            }
            onClick={() => {
              // Guardar el texto de fábrica no es personalizar: es volver
              // atrás, y como tal borra la personalización en vez de dejar una
              // copia congelada que ya no recibe las mejoras de la app.
              if (esOriginal) {
                restablecer.mutate(
                  { clave: prompt.clave },
                  { onSuccess: alGuardar },
                );
                return;
              }
              guardar.mutate(
                { clave: prompt.clave, texto },
                { onSuccess: alGuardar },
              );
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
