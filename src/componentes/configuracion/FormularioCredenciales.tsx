"use client";

import { Bot, CheckCircle2, Circle, Mic } from "lucide-react";
import { useCredenciales } from "@/lib/hooks/useCredenciales";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { PromptsIA } from "./PromptsIA";

/**
 * La IA del consultorio: si la plataforma la tiene disponible y las
 * instrucciones (prompts) propias del profesional. Los criterios de búsqueda
 * de ingredientes estaban acá y se mudaron a la sección Alimentos
 * (`CriteriosIngredientes`): filtran el buscador, no tienen nada de IA.
 *
 * Las CLAVES no están acá: desde la migración 71 las carga el SUPERADMIN una
 * sola vez para todos los consultorios. Lo que sí es de cada profesional es
 * cómo le habla la IA, y eso son los prompts.
 */
export function FormularioCredenciales() {
  const { estado } = useCredenciales();
  const consulta = estado();
  const e = consulta.data;

  if (consulta.isLoading || !e) {
    return <Skeleton className="h-64 w-full" />;
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
                <Mic className="h-4 w-4 text-muted-foreground" /> Voz a texto de
                las grabaciones
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
