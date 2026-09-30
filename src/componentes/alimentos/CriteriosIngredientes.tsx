"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
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

/**
 * Filtros que el consultorio le aplica a la búsqueda de alimentos (recetas,
 * planes y planes semanales).
 *
 * Vivía en la pestaña de IA de Integraciones porque se guarda junto con el
 * estado de credenciales (`credenciales.guardar`), pero no tiene nada de IA:
 * cambia qué trae el buscador de alimentos, y por eso está en su sección.
 */
export function CriteriosIngredientes() {
  const { estado, guardar } = useCredenciales();
  const consulta = estado();
  const e = consulta.data;

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-5 w-5 text-primary" /> Criterios de
          búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Filtrá los alimentos que trae la búsqueda de ingredientes. Se aplican
          a todas tus búsquedas (recetas y planes). Dejalos vacíos para no
          filtrar.
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
  );
}
