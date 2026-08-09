"use client";

import { useEffect, useState } from "react";
import { Bot, Utensils, CheckCircle2, Circle, SlidersHorizontal } from "lucide-react";
import { useCredenciales } from "@/lib/hooks/useCredenciales";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

type ProveedorIA = "ANTHROPIC" | "OPENROUTER";

/**
 * Carga de credenciales de integraciones del profesional: la clave de Claude
 * (chat del paciente + análisis de foto de comida) y las de FatSecret (macros de
 * ingredientes). Los secretos se guardan cifrados y nunca se muestran de vuelta.
 */
export function FormularioCredenciales() {
  const { estado, guardar } = useCredenciales();
  const consulta = estado();
  const e = consulta.data;

  const [proveedor, setProveedor] = useState<ProveedorIA>("ANTHROPIC");
  const [claudeKey, setClaudeKey] = useState("");
  const [modelo, setModelo] = useState("");
  const [fatId, setFatId] = useState("");
  const [fatSecret, setFatSecret] = useState("");

  // Criterios de ingredientes.
  const [excluirMarcas, setExcluirMarcas] = useState(false);
  const [requiereMacros, setRequiereMacros] = useState(false);
  const [maxCalorias, setMaxCalorias] = useState(""); // "" = sin tope
  const [excluirTexto, setExcluirTexto] = useState(""); // coma-separado

  // Precarga proveedor y modelo (no secretos) una vez que llega el estado.
  useEffect(() => {
    if (e?.proveedorIA) setProveedor(e.proveedorIA);
  }, [e?.proveedorIA]);
  useEffect(() => {
    if (e?.anthropicModelo) setModelo(e.anthropicModelo);
  }, [e?.anthropicModelo]);
  useEffect(() => {
    const c = e?.criterios;
    if (!c) return;
    setExcluirMarcas(c.excluirMarcas);
    setRequiereMacros(c.requiereMacros);
    setMaxCalorias(c.maxCaloriasPor100 != null ? String(c.maxCaloriasPor100) : "");
    setExcluirTexto(c.excluirTexto.join(", "));
  }, [e?.criterios]);

  if (consulta.isLoading || !e) {
    return <Skeleton className="h-64 w-full" />;
  }

  const esOpenRouter = proveedor === "OPENROUTER";

  function guardarClaude() {
    guardar.mutate({
      proveedorIA: proveedor,
      anthropicApiKey: claudeKey.trim() || undefined, // vacío = no cambiar
      anthropicModelo: modelo.trim() || undefined,
    });
    setClaudeKey("");
  }

  function guardarFatSecret() {
    if (!fatId.trim() || !fatSecret.trim()) return;
    guardar.mutate({
      fatsecretClientId: fatId.trim(),
      fatsecretClientSecret: fatSecret.trim(),
    });
    setFatId("");
    setFatSecret("");
  }

  function guardarCriterios() {
    const max = maxCalorias.trim() === "" ? null : Number(maxCalorias);
    guardar.mutate({
      criterios: {
        excluirMarcas,
        requiereMacros,
        maxCaloriasPor100: max != null && Number.isFinite(max) ? max : null,
        excluirTexto: excluirTexto
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Claude */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> IA (Claude)
            </span>
            <Estado activo={e.anthropicConfigurado} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Habilita el chat del paciente y el análisis de la foto de comida. Podés usar la API
            de Anthropic directa o <strong>OpenRouter</strong> (una sola key para varios modelos).
            Sin clave, esas funciones quedan en modo demostración.
          </p>
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select value={proveedor} onValueChange={(v) => setProveedor(v as ProveedorIA)}>
              <SelectTrigger aria-label="Proveedor de IA" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANTHROPIC">Anthropic (Claude directo)</SelectItem>
                <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claudeKey">API key {esOpenRouter ? "de OpenRouter" : "de Anthropic"}</Label>
            <Input
              id="claudeKey"
              type="password"
              autoComplete="off"
              placeholder={
                e.anthropicConfigurado
                  ? "•••• configurada — dejá vacío para no cambiarla"
                  : esOpenRouter
                    ? "sk-or-…"
                    : "sk-ant-…"
              }
              value={claudeKey}
              onChange={(ev) => setClaudeKey(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modelo">Modelo (opcional)</Label>
            <Input
              id="modelo"
              placeholder={
                esOpenRouter
                  ? "anthropic/claude-opus-5 (por defecto). Ej: openai/gpt-4o, google/gemini-2.5-pro"
                  : "claude-opus-5 (por defecto). Ej: claude-sonnet-5, claude-haiku-4-5"
              }
              value={modelo}
              onChange={(ev) => setModelo(ev.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            {e.anthropicConfigurado && (
              <Button
                type="button"
                variant="outline"
                disabled={guardar.isPending}
                onClick={() => guardar.mutate({ anthropicApiKey: "" })}
              >
                Quitar clave
              </Button>
            )}
            <Button type="button" disabled={guardar.isPending} onClick={guardarClaude}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FatSecret */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" /> Ingredientes (FatSecret)
            </span>
            <Estado activo={e.fatsecretConfigurado} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Trae los macros de los ingredientes desde FatSecret Platform (OAuth 2.0:{" "}
            <strong>Client ID</strong> + <strong>Client Secret</strong> desde su portal).{" "}
            <strong>Importante:</strong> FatSecret exige habilitar la IP de tu servidor en la
            cuenta (<em>IP Restrictions</em>); si no, no devuelve datos. Su base está en inglés:
            con la clave de Claude cargada arriba, la búsqueda y los resultados se traducen al
            español automáticamente. Sin credenciales de FatSecret se usa Open Food Facts (gratis).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fatId">Client ID</Label>
              <Input
                id="fatId"
                autoComplete="off"
                placeholder={e.fatsecretConfigurado ? "•••• configurado" : ""}
                value={fatId}
                onChange={(ev) => setFatId(ev.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fatSecret">Client Secret</Label>
              <Input
                id="fatSecret"
                type="password"
                autoComplete="off"
                placeholder={e.fatsecretConfigurado ? "•••• configurado" : ""}
                value={fatSecret}
                onChange={(ev) => setFatSecret(ev.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {e.fatsecretConfigurado && (
              <Button
                type="button"
                variant="outline"
                disabled={guardar.isPending}
                onClick={() =>
                  guardar.mutate({ fatsecretClientId: "", fatsecretClientSecret: "" })
                }
              >
                Quitar
              </Button>
            )}
            <Button
              type="button"
              disabled={guardar.isPending || !fatId.trim() || !fatSecret.trim()}
              onClick={guardarFatSecret}
            >
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Criterios de ingredientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-5 w-5 text-primary" /> Criterios de ingredientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Filtrá los alimentos que trae la búsqueda de ingredientes. Se aplican a todas
            tus búsquedas (recetas y planes). Dejalos vacíos para no filtrar.
          </p>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={excluirMarcas}
              onChange={(ev) => setExcluirMarcas(ev.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Solo alimentos genéricos</span>
              <span className="block text-xs text-muted-foreground">
                Descarta los que tienen marca comercial.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={requiereMacros}
              onChange={(ev) => setRequiereMacros(ev.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Solo con macros completos</span>
              <span className="block text-xs text-muted-foreground">
                Descarta los que no traen calorías, proteínas, carbohidratos y grasas.
              </span>
            </span>
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="maxCalorias">Máximo de calorías por 100 g (opcional)</Label>
            <Input
              id="maxCalorias"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="sin tope"
              className="w-full sm:w-48"
              value={maxCalorias}
              onChange={(ev) => setMaxCalorias(ev.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="excluirTexto">Excluir si el nombre contiene (separá con comas)</Label>
            <Input
              id="excluirTexto"
              placeholder="ej: frito, jarabe, light"
              value={excluirTexto}
              onChange={(ev) => setExcluirTexto(ev.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" disabled={guardar.isPending} onClick={guardarCriterios}>
              Guardar criterios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Estado({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="flex items-center gap-1 text-xs font-normal text-primary">
      <CheckCircle2 className="h-4 w-4" /> Configurada
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
      <Circle className="h-4 w-4" /> Sin configurar
    </span>
  );
}
