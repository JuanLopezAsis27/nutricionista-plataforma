"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Utensils,
  CheckCircle2,
  Circle,
  Mic,
  SlidersHorizontal,
} from "lucide-react";
import { useCredenciales } from "@/lib/hooks/useCredenciales";
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
import { EliminarCredenciales } from "./EliminarCredenciales";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

type ProveedorIA = "ANTHROPIC" | "OPENROUTER";
type ProveedorTranscripcion = "OPENAI" | "OPENROUTER";

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

  // Voz a texto de las grabaciones de consulta.
  const [proveedorVoz, setProveedorVoz] =
    useState<ProveedorTranscripcion>("OPENAI");
  const [vozKey, setVozKey] = useState("");
  const [vozModelo, setVozModelo] = useState("");

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
    if (e?.proveedorTranscripcion) setProveedorVoz(e.proveedorTranscripcion);
  }, [e?.proveedorTranscripcion]);
  useEffect(() => {
    if (e?.transcripcionModelo) setVozModelo(e.transcripcionModelo);
  }, [e?.transcripcionModelo]);
  useEffect(() => {
    const c = e?.criterios;
    if (!c) return;
    setExcluirMarcas(c.excluirMarcas);
    setRequiereMacros(c.requiereMacros);
    setMaxCalorias(
      c.maxCaloriasPor100 != null ? String(c.maxCaloriasPor100) : "",
    );
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

  function guardarVoz() {
    guardar.mutate({
      proveedorTranscripcion: proveedorVoz,
      transcripcionApiKey: vozKey.trim() || undefined, // vacío = no cambiar
      transcripcionModelo: vozModelo.trim() || undefined,
    });
    setVozKey("");
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
            Habilita el chat del paciente y el análisis de la foto de comida.
            Podés usar la API de Anthropic directa o <strong>OpenRouter</strong>{" "}
            (una sola key para varios modelos). Sin clave, esas funciones quedan
            en modo demostración.
          </p>
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select
              value={proveedor}
              onValueChange={(v) => setProveedor(v as ProveedorIA)}
            >
              <SelectTrigger
                aria-label="Proveedor de IA"
                className="w-full sm:w-64"
              >
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
            <Label htmlFor="claudeKey">
              API key {esOpenRouter ? "de OpenRouter" : "de Anthropic"}
            </Label>
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
            <EliminarCredenciales
              integracion="IA"
              nombre="la IA"
              consecuencia="El chat del paciente y el análisis de foto de comida vuelven al modo demostración."
              configurada={e.anthropicConfigurado}
            />
            <Button
              type="button"
              disabled={guardar.isPending}
              onClick={guardarClaude}
            >
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
              <Utensils className="h-5 w-5 text-primary" /> Ingredientes
              (FatSecret)
            </span>
            <Estado activo={e.fatsecretConfigurado} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Trae los macros de los ingredientes desde FatSecret Platform (OAuth
            2.0: <strong>Client ID</strong> + <strong>Client Secret</strong>{" "}
            desde su portal). <strong>Importante:</strong> FatSecret exige
            habilitar la IP de tu servidor en la cuenta (
            <em>IP Restrictions</em>); si no, no devuelve datos. Su base está en
            inglés: con la clave de Claude cargada arriba, la búsqueda y los
            resultados se traducen al español automáticamente. Sin credenciales
            de FatSecret se usa Open Food Facts (gratis).
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
            <EliminarCredenciales
              integracion="FATSECRET"
              nombre="FatSecret"
              consecuencia="La búsqueda de ingredientes vuelve a Open Food Facts."
              configurada={e.fatsecretConfigurado}
            />
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

      {/* Voz a texto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> Voz a texto (grabaciones)
            </span>
            <Estado activo={e.transcripcionConfigurada} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Transcribe el audio de las consultas que grabás desde el turno. Es
            una clave <strong>aparte</strong> de la de arriba porque Anthropic
            no transcribe audio: acá va OpenAI (Whisper) o OpenRouter. El
            resumen de la consulta lo sigue haciendo la IA configurada arriba.
            Sin clave, el audio se guarda igual y podés transcribirlo después.
          </p>
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select
              value={proveedorVoz}
              onValueChange={(v) =>
                setProveedorVoz(v as ProveedorTranscripcion)
              }
            >
              <SelectTrigger
                aria-label="Proveedor de voz a texto"
                className="w-full sm:w-64"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPENAI">OpenAI (recomendado)</SelectItem>
                <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
            {proveedorVoz === "OPENROUTER" && (
              <p className="text-xs text-muted-foreground">
                OpenRouter no tiene un servicio de transcripción: el audio se le
                manda a un modelo de chat que escucha. No acepta el formato que
                graba Chrome (WebM) y puede resumir de más en consultas largas.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vozKey">
              API key{" "}
              {proveedorVoz === "OPENROUTER" ? "de OpenRouter" : "de OpenAI"}
            </Label>
            <Input
              id="vozKey"
              type="password"
              autoComplete="off"
              placeholder={
                e.transcripcionConfigurada
                  ? "•••• configurada — dejá vacío para no cambiarla"
                  : proveedorVoz === "OPENROUTER"
                    ? "sk-or-…"
                    : "sk-…"
              }
              value={vozKey}
              onChange={(ev) => setVozKey(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vozModelo">Modelo (opcional)</Label>
            <Input
              id="vozModelo"
              placeholder={
                proveedorVoz === "OPENROUTER"
                  ? "google/gemini-2.5-flash (por defecto)"
                  : "gpt-4o-transcribe (por defecto). Ej: whisper-1"
              }
              value={vozModelo}
              onChange={(ev) => setVozModelo(ev.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <EliminarCredenciales
              integracion="TRANSCRIPCION"
              nombre="voz a texto"
              consecuencia="Las grabaciones nuevas dejan de transcribirse; el audio ya guardado no se toca."
              configurada={e.transcripcionConfigurada}
            />
            <Button
              type="button"
              disabled={guardar.isPending}
              onClick={guardarVoz}
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
            <SlidersHorizontal className="h-5 w-5 text-primary" /> Criterios de
            ingredientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Filtrá los alimentos que trae la búsqueda de ingredientes. Se
            aplican a todas tus búsquedas (recetas y planes). Dejalos vacíos
            para no filtrar.
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
                Descarta los que no traen calorías, proteínas, carbohidratos y
                grasas.
              </span>
            </span>
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="maxCalorias">
              Máximo de calorías por 100 g (opcional)
            </Label>
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
            <Label htmlFor="excluirTexto">
              Excluir si el nombre contiene (separá con comas)
            </Label>
            <Input
              id="excluirTexto"
              placeholder="ej: frito, jarabe, light"
              value={excluirTexto}
              onChange={(ev) => setExcluirTexto(ev.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={guardar.isPending}
              onClick={guardarCriterios}
            >
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
