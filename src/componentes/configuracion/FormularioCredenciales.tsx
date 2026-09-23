"use client";

import { useEffect, useState } from "react";
import {
  Bot,
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
import { PromptsIA } from "./PromptsIA";

/**
 * La IA del consultorio: si la plataforma la tiene disponible, las
 * instrucciones (prompts) propias del profesional y los criterios de
 * ingredientes.
 *
 * Las CLAVES no están acá: desde la migración 71 las carga el SUPERADMIN una
 * sola vez para todos los consultorios. Lo que sí es de cada profesional es
 * cómo le habla la IA, y eso son los prompts.
 */
export function FormularioCredenciales() {
  const { estado, guardar } = useCredenciales();
  const consulta = estado();
  const e = consulta.data;

  // Criterios de ingredientes.
  const [excluirMarcas, setExcluirMarcas] = useState(false);
  const [requiereMacros, setRequiereMacros] = useState(false);
  const [maxCalorias, setMaxCalorias] = useState(""); // "" = sin tope
  const [excluirTexto, setExcluirTexto] = useState(""); // coma-separado

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
      {/* Disponibilidad (la configura la plataforma) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" /> Inteligencia artificial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La conexión con los proveedores de IA la administra la plataforma:
            no necesitás cargar ninguna clave. Lo que sí podés ajustar son las
            instrucciones que recibe la IA en cada función, más abajo.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" /> Asistente,
                análisis de comida y lectura de documentos
              </span>
              <Estado activo={e.iaDisponible} />
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" /> Voz a texto
                de las grabaciones
              </span>
              <Estado activo={e.transcripcionDisponible} />
            </li>
          </ul>
          {(!e.iaDisponible || !e.transcripcionDisponible) && (
            <p className="text-xs text-muted-foreground">
              Lo que figura como no disponible depende del administrador de la
              plataforma.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones (system prompts) de cada funcionalidad de IA */}
      <PromptsIA />

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
    <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-primary">
      <CheckCircle2 className="h-4 w-4" /> Disponible
    </span>
  ) : (
    <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground">
      <Circle className="h-4 w-4" /> No disponible
    </span>
  );
}
