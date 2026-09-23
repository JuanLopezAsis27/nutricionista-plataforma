"use client";

import { useState } from "react";
import type { EstadoIAPlataformaDto } from "@/aplicacion/dtos/iaPlataforma.dto";
import { Bot, CheckCircle2, Circle, KeyRound, Mic, Trash2 } from "lucide-react";
import { useIAPlataforma } from "@/lib/hooks/useIAPlataforma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";

type ProveedorClave = "ANTHROPIC" | "OPENROUTER" | "OPENAI";
type ProveedorIA = "ANTHROPIC" | "OPENROUTER";
type ProveedorVoz = "OPENAI" | "OPENROUTER";

export const NOMBRE_PROVEEDOR: Record<ProveedorClave, string> = {
  ANTHROPIC: "Anthropic",
  OPENROUTER: "OpenRouter",
  OPENAI: "OpenAI",
};

const PLACEHOLDER_CLAVE: Record<ProveedorClave, string> = {
  ANTHROPIC: "sk-ant-…",
  OPENROUTER: "sk-or-…",
  OPENAI: "sk-…",
};

/**
 * Claves y modelos de IA de la plataforma. Las usan TODOS los consultorios:
 * cada profesional solo personaliza sus prompts.
 *
 * Una clave por proveedor, y aparte qué proveedor usa cada capacidad: la de
 * OpenRouter puede servir a la vez para conversar y para transcribir.
 */
export function ConfiguracionIAPlataforma() {
  const { estado } = useIAPlataforma();
  const consulta = estado();
  if (consulta.isLoading || !consulta.data) {
    return <Skeleton className="h-64 w-full" />;
  }
  // El formulario arranca de lo guardado; al cambiar lo guardado se vuelve a
  // montar con los valores nuevos en vez de copiarlos a mano en un efecto.
  const e = consulta.data;
  return (
    <FormularioIA
      key={[
        e.proveedorIA,
        e.modeloIA,
        e.proveedorTranscripcion,
        e.modeloTranscripcion,
      ].join("|")}
      e={e}
    />
  );
}

function FormularioIA({ e }: { e: EstadoIAPlataformaDto }) {
  const { guardar, eliminarClave } = useIAPlataforma();

  const [claves, setClaves] = useState<Record<ProveedorClave, string>>({
    ANTHROPIC: "",
    OPENROUTER: "",
    OPENAI: "",
  });
  const [proveedorIA, setProveedorIA] = useState<ProveedorIA>(e.proveedorIA);
  const [modeloIA, setModeloIA] = useState(e.modeloIA ?? "");
  const [proveedorVoz, setProveedorVoz] = useState<ProveedorVoz>(
    e.proveedorTranscripcion,
  );
  const [modeloVoz, setModeloVoz] = useState(e.modeloTranscripcion ?? "");
  const [borrando, setBorrando] = useState<ProveedorClave | null>(null);

  const configurada = (p: ProveedorClave): boolean =>
    e.claves.find((c) => c.proveedor === p)?.configurada ?? false;

  function guardarTodo() {
    guardar.mutate(
      {
        claves,
        proveedorIA,
        modeloIA: modeloIA.trim(),
        proveedorTranscripcion: proveedorVoz,
        modeloTranscripcion: modeloVoz.trim(),
      },
      {
        onSuccess: () =>
          setClaves({ ANTHROPIC: "", OPENROUTER: "", OPENAI: "" }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-primary" /> Claves de los
            proveedores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se guardan cifradas y nunca vuelven al navegador. Dejá un campo
            vacío para no cambiar la clave que ya está cargada.
          </p>
          {(["ANTHROPIC", "OPENROUTER", "OPENAI"] as const).map((p) => (
            <div key={p} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`clave-${p}`}>{NOMBRE_PROVEEDOR[p]}</Label>
                <Estado activo={configurada(p)} />
              </div>
              <div className="flex gap-2">
                <Input
                  id={`clave-${p}`}
                  type="password"
                  autoComplete="off"
                  placeholder={
                    configurada(p)
                      ? "•••• cargada — dejá vacío para no cambiarla"
                      : PLACEHOLDER_CLAVE[p]
                  }
                  value={claves[p]}
                  onChange={(ev) =>
                    setClaves((actual) => ({ ...actual, [p]: ev.target.value }))
                  }
                />
                {configurada(p) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title={`Eliminar la clave de ${NOMBRE_PROVEEDOR[p]}`}
                    onClick={() => setBorrando(p)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> Asistente y lectura de
              documentos
            </span>
            <Estado activo={e.iaActiva} textoActivo="Activa" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select
              value={proveedorIA}
              onValueChange={(v) => setProveedorIA(v as ProveedorIA)}
            >
              <SelectTrigger aria-label="Proveedor de IA">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANTHROPIC">
                  Anthropic (Claude directo)
                </SelectItem>
                <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modeloIA">Modelo</Label>
            <Input
              id="modeloIA"
              placeholder={
                proveedorIA === "OPENROUTER"
                  ? "anthropic/claude-opus-5 (por defecto)"
                  : "claude-opus-5 (por defecto)"
              }
              value={modeloIA}
              onChange={(ev) => setModeloIA(ev.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {proveedorIA === "OPENROUTER" ? (
              <>
                En OpenRouter los modelos se escriben{" "}
                <strong>proveedor/modelo</strong> (
                <code>openai/gpt-4o-mini</code>
                ).{" "}
              </>
            ) : (
              <>Va el nombre del modelo solo, sin prefijo. </>
            )}
            Tiene que ser un modelo <strong>con visión</strong>: también analiza
            las fotos de comida. Vacío = el modelo por defecto.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> Voz a texto (grabaciones)
            </span>
            <Estado activo={e.transcripcionActiva} textoActivo="Activa" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select
              value={proveedorVoz}
              onValueChange={(v) => setProveedorVoz(v as ProveedorVoz)}
            >
              <SelectTrigger aria-label="Proveedor de voz a texto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPENAI">OpenAI (recomendado)</SelectItem>
                <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modeloVoz">Modelo</Label>
            <Input
              id="modeloVoz"
              placeholder={
                proveedorVoz === "OPENROUTER"
                  ? "google/gemini-2.5-flash (por defecto)"
                  : "gpt-4o-transcribe (por defecto)"
              }
              value={modeloVoz}
              onChange={(ev) => setModeloVoz(ev.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Anthropic no transcribe audio, por eso es una elección aparte.
            OpenRouter no acepta el WebM que graba Chrome y puede resumir de más
            en consultas largas.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={guardar.isPending} onClick={guardarTodo}>
          Guardar configuración
        </Button>
      </div>

      <ModalConfirmacion
        abierto={borrando !== null}
        titulo={`Eliminar la clave de ${borrando ? NOMBRE_PROVEEDOR[borrando] : ""}`}
        descripcion="Todos los consultorios que dependan de este proveedor se quedan sin esa función hasta que cargues otra clave. La app nunca muestra una clave guardada: para volver a usarla vas a tener que copiarla de nuevo desde el portal del proveedor."
        cargando={eliminarClave.isPending}
        onCancelar={() => setBorrando(null)}
        onConfirmar={() =>
          borrando &&
          eliminarClave.mutate(
            { proveedor: borrando },
            { onSuccess: () => setBorrando(null) },
          )
        }
      />
    </div>
  );
}

function Estado({
  activo,
  textoActivo = "Cargada",
}: {
  activo: boolean;
  textoActivo?: string;
}) {
  return activo ? (
    <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-primary">
      <CheckCircle2 className="h-4 w-4" /> {textoActivo}
    </span>
  ) : (
    <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground">
      <Circle className="h-4 w-4" /> Sin configurar
    </span>
  );
}
